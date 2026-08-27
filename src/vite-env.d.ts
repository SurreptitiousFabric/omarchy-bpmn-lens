/// <reference types="vite/client" />

declare module "bpmn-js/lib/NavigatedViewer" {
  interface ImportResult {
    warnings: Array<unknown>;
  }

  interface EventBus {
    on(event: string, callback: (event: { element?: BpmnElement }) => void): void;
  }

  interface Canvas {
    zoom(): number;
    zoom(level: "fit-viewport" | number): number;
    addMarker(elementId: string, marker: string): void;
    removeMarker(elementId: string, marker: string): void;
    viewbox(bounds: { x: number; y: number; width: number; height: number }): void;
  }

  interface BpmnElement {
    id: string;
    type: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    waypoints?: Array<{ x: number; y: number }>;
    incoming?: BpmnElement[];
    outgoing?: BpmnElement[];
    source?: BpmnElement;
    target?: BpmnElement;
    businessObject?: { id?: string; name?: string; $type?: string };
  }

  interface ElementRegistry {
    get(id: string): BpmnElement | undefined;
    getAll(): BpmnElement[];
  }

  export default class NavigatedViewer {
    constructor(options: { container: HTMLElement | string });
    importXML(xml: string): Promise<ImportResult>;
    get(service: "eventBus"): EventBus;
    get(service: "canvas"): Canvas;
    get(service: "elementRegistry"): ElementRegistry;
    destroy(): void;
  }
}

declare module "bpmn-moddle" {
  export class BpmnModdle {
    constructor(additionalPackages?: Record<string, unknown>, options?: Record<string, unknown>);
    fromXML(xml: string): Promise<{ rootElement: unknown; warnings: Array<{ message: string }> }>;
  }
}
