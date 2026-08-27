import QtQuick
import Quickshell
import Quickshell.Wayland
import qs.Commons
import qs.Ui

Item {
  id: root

  property var shell: null
  property var manifest: null
  property bool opened: false

  readonly property string pluginId: (manifest && manifest.id) || "surreptitiousfabric.bpmn-lens"
  readonly property string sourceDir: (manifest && manifest.__sourceDir) || ""
  readonly property color background: Color.menu.background
  readonly property color foreground: Color.menu.text
  readonly property color accent: Color.accent
  readonly property var borderSpec: Border.surfaceSpec("menu", "border", Color.menu.border, Math.max(1, Style.space(2)))

  function open(_payloadJson) {
    opened = true
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  function close() { opened = false }

  function dismiss() {
    opened = false
    if (shell && typeof shell.hide === "function") shell.hide(pluginId)
  }

  function launch() {
    if (!sourceDir) return
    dismiss()
    Quickshell.execDetached(["mise", "-C", sourceDir, "run", "open"])
  }

  PanelWindow {
    id: window
    visible: root.opened
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    WlrLayershell.namespace: "bpmn-lens"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive
    exclusionMode: ExclusionMode.Ignore

    Rectangle { anchors.fill: parent; color: Color.menu.scrim }
    MouseArea { anchors.fill: parent; onClicked: root.dismiss() }

    BorderSurface {
      width: Math.min(Style.space(360), window.width - Style.gapsOut * 2)
      height: Math.min(Style.space(190), window.height - Style.gapsOut * 2)
      anchors.centerIn: parent
      radius: Style.cornerRadius
      color: root.background
      borderSpec: root.borderSpec
      padding: Style.spacing.panelPadding

      MouseArea { anchors.fill: parent; onClicked: {} }

      Item {
        id: keyCatcher
        anchors.fill: parent
        focus: true
        Keys.onPressed: function(event) {
          if (event.key === Qt.Key_Escape) root.dismiss()
          else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) root.launch()
          else return
          event.accepted = true
        }
      }

      Column {
        anchors.fill: parent
        anchors.margins: Style.spacing.panelPadding
        spacing: Style.spacing.panelGap

        Text {
          text: "BPMN Lens"
          color: root.foreground
          font.family: Style.font.menuFamily
          font.pixelSize: Style.font.title
          font.bold: true
        }

        Text {
          width: parent.width
          text: "Explore local process diagrams and their source-grounded explanations. No document editing or network access."
          color: root.foreground
          opacity: 0.72
          wrapMode: Text.WordWrap
          font.family: Style.font.menuFamily
          font.pixelSize: Style.font.body
        }

        Button {
          text: "Open viewer"
          hasCursor: true
          onClicked: root.launch()
        }

        Text {
          text: "Enter open  ·  Esc close"
          color: root.foreground
          opacity: 0.52
          font.family: Style.font.menuFamily
          font.pixelSize: Style.font.caption
        }
      }
    }
  }
}
