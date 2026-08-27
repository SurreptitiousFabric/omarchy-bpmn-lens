import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { BpmnModdle } from "bpmn-moddle";
import { describe, expect, it } from "vitest";

interface Point { x: number; y: number }
interface Bounds extends Point { width: number; height: number }
interface ModelElement {
  id: string;
  $type: string;
  sourceRef?: ModelElement;
  targetRef?: ModelElement;
}
interface PlaneElement {
  $type: string;
  bpmnElement: ModelElement;
  bounds?: Bounds;
  waypoint?: Point[];
  label?: { bounds?: Bounds };
}

const root = path.resolve(import.meta.dirname, "..");
const diagramsDir = path.join(root, "public/content/diagrams");
const moddle = new BpmnModdle();

function onBoundary(point: Point, bounds: Bounds): boolean {
  const epsilon = 0.01;
  const betweenX = point.x >= bounds.x - epsilon && point.x <= bounds.x + bounds.width + epsilon;
  const betweenY = point.y >= bounds.y - epsilon && point.y <= bounds.y + bounds.height + epsilon;
  const onVertical = Math.abs(point.x - bounds.x) <= epsilon || Math.abs(point.x - bounds.x - bounds.width) <= epsilon;
  const onHorizontal = Math.abs(point.y - bounds.y) <= epsilon || Math.abs(point.y - bounds.y - bounds.height) <= epsilon;
  return (onVertical && betweenY) || (onHorizontal && betweenX);
}

function crossesInterior(start: Point, end: Point, bounds: Bounds): boolean {
  const inset = 0.5;
  const left = bounds.x + inset;
  const right = bounds.x + bounds.width - inset;
  const top = bounds.y + inset;
  const bottom = bounds.y + bounds.height - inset;
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let near = 0;
  let far = 1;

  for (const [direction, distance] of [
    [-deltaX, start.x - left],
    [deltaX, right - start.x],
    [-deltaY, start.y - top],
    [deltaY, bottom - start.y]
  ] as Array<[number, number]>) {
    if (direction === 0) {
      if (distance < 0) return false;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) near = Math.max(near, ratio);
    else far = Math.min(far, ratio);
    if (near > far) return false;
  }
  return far > 0 && near < 1 && near <= far;
}

function overlaps(first: Bounds, second: Bounds): boolean {
  return first.x < second.x + second.width && first.x + first.width > second.x &&
    first.y < second.y + second.height && first.y + first.height > second.y;
}

describe("BPMN Diagram Interchange routing", () => {
  it("gives every text-bearing node its own non-overlapping bounds", async () => {
    const files = (await readdir(diagramsDir)).filter((file) => file.endsWith(".bpmn")).sort();
    for (const file of files) {
      const parsed = await moddle.fromXML(await readFile(path.join(diagramsDir, file), "utf8"));
      const definitions = parsed.rootElement as unknown as { diagrams?: Array<{ plane?: { planeElement?: PlaneElement[] } }> };
      const nodeShapes = (definitions.diagrams?.[0]?.plane?.planeElement || []).filter(
        (element) => element.$type === "bpmndi:BPMNShape" && element.bounds && element.bpmnElement.$type !== "bpmn:Lane"
      );
      for (let first = 0; first < nodeShapes.length; first += 1) {
        for (let second = first + 1; second < nodeShapes.length; second += 1) {
          const firstShape = nodeShapes[first];
          const secondShape = nodeShapes[second];
          if (!firstShape?.bounds || !secondShape?.bounds) continue;
          expect(
            overlaps(firstShape.bounds, secondShape.bounds),
            `${file} ${firstShape.bpmnElement.id} overlaps ${secondShape.bpmnElement.id}`
          ).toBe(false);
        }
      }
    }
  });

  it("anchors every sequence flow on source and target boundaries", async () => {
    const files = (await readdir(diagramsDir)).filter((file) => file.endsWith(".bpmn")).sort();
    for (const file of files) {
      const parsed = await moddle.fromXML(await readFile(path.join(diagramsDir, file), "utf8"));
      const definitions = parsed.rootElement as unknown as { diagrams?: Array<{ plane?: { planeElement?: PlaneElement[] } }> };
      const planeElements = definitions.diagrams?.[0]?.plane?.planeElement || [];
      const boundsByElement = new Map(
        planeElements
          .filter((element) => element.$type === "bpmndi:BPMNShape" && element.bounds)
          .map((element) => [element.bpmnElement.id, element.bounds as Bounds])
      );

      for (const edge of planeElements.filter((element) => element.$type === "bpmndi:BPMNEdge")) {
        const flow = edge.bpmnElement;
        if (flow.$type !== "bpmn:SequenceFlow") continue;
        const waypoints = edge.waypoint || [];
        const sourceBounds = boundsByElement.get(flow.sourceRef?.id || "");
        const targetBounds = boundsByElement.get(flow.targetRef?.id || "");
        expect(sourceBounds, `${file} ${flow.id} source shape`).toBeDefined();
        expect(targetBounds, `${file} ${flow.id} target shape`).toBeDefined();
        expect(waypoints.length, `${file} ${flow.id} waypoints`).toBeGreaterThanOrEqual(2);
        expect(onBoundary(waypoints[0] as Point, sourceBounds as Bounds), `${file} ${flow.id} source anchor`).toBe(true);
        expect(onBoundary(waypoints.at(-1) as Point, targetBounds as Bounds), `${file} ${flow.id} target anchor`).toBe(true);
      }
    }
  });

  it("keeps sequence flows out of unrelated text-bearing nodes", async () => {
    const files = (await readdir(diagramsDir)).filter((file) => file.endsWith(".bpmn")).sort();
    for (const file of files) {
      const parsed = await moddle.fromXML(await readFile(path.join(diagramsDir, file), "utf8"));
      const definitions = parsed.rootElement as unknown as { diagrams?: Array<{ plane?: { planeElement?: PlaneElement[] } }> };
      const planeElements = definitions.diagrams?.[0]?.plane?.planeElement || [];
      const nodeShapes = planeElements.filter(
        (element) => element.$type === "bpmndi:BPMNShape" && element.bounds && element.bpmnElement.$type !== "bpmn:Lane"
      );

      for (const edge of planeElements.filter((element) => element.$type === "bpmndi:BPMNEdge")) {
        const flow = edge.bpmnElement;
        if (flow.$type !== "bpmn:SequenceFlow") continue;
        const waypoints = edge.waypoint || [];
        for (const shape of nodeShapes) {
          if (shape.bpmnElement.id === flow.sourceRef?.id || shape.bpmnElement.id === flow.targetRef?.id) continue;
          for (let index = 1; index < waypoints.length; index += 1) {
            const start = waypoints[index - 1];
            const end = waypoints[index];
            if (!start || !end) continue;
            expect(
              crossesInterior(start, end, shape.bounds as Bounds),
              `${file} ${flow.id} crosses ${shape.bpmnElement.id}`
            ).toBe(false);
          }
        }
      }
    }
  });

  it("keeps sequence flows out of explicit gateway and event labels", async () => {
    const files = (await readdir(diagramsDir)).filter((file) => file.endsWith(".bpmn")).sort();
    for (const file of files) {
      const parsed = await moddle.fromXML(await readFile(path.join(diagramsDir, file), "utf8"));
      const definitions = parsed.rootElement as unknown as { diagrams?: Array<{ plane?: { planeElement?: PlaneElement[] } }> };
      const planeElements = definitions.diagrams?.[0]?.plane?.planeElement || [];
      const externalLabels = planeElements
        .filter((element) => ["bpmn:ExclusiveGateway", "bpmn:StartEvent", "bpmn:EndEvent"].includes(element.bpmnElement.$type))
        .map((element) => ({ id: element.bpmnElement.id, bounds: element.label?.bounds }));
      expect(externalLabels.every((label) => label.bounds), `${file} external label bounds`).toBe(true);

      for (const edge of planeElements.filter((element) => element.$type === "bpmndi:BPMNEdge")) {
        const waypoints = edge.waypoint || [];
        for (const label of externalLabels) {
          if (!label.bounds) continue;
          for (let index = 1; index < waypoints.length; index += 1) {
            const start = waypoints[index - 1];
            const end = waypoints[index];
            if (!start || !end) continue;
            expect(
              crossesInterior(start, end, label.bounds),
              `${file} ${edge.bpmnElement.id} crosses ${label.id} label`
            ).toBe(false);
          }
        }
      }
    }
  });
});
