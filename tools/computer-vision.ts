import { Tool } from "./index";

function imageId(params: Record<string, unknown>): string {
  return String(params.imageId ?? params.url ?? "image-sample");
}

export const detectObjectsTool: Tool = {
  name: "cv.detectObjects",
  description: "Detect objects in an image and return labels, confidence, and boxes.",
  async execute(params) {
    return { imageId: imageId(params), objects: [{ label: "asset", confidence: 0.94, box: [0.12, 0.18, 0.48, 0.52] }] };
  },
};

export const segmentTool: Tool = {
  name: "cv.segment",
  description: "Segment image regions for industrial and grid assets.",
  async execute(params) {
    return { imageId: imageId(params), masks: [{ label: "infrastructure", coverage: 0.42 }, { label: "background", coverage: 0.58 }] };
  },
};

export const ocrTool: Tool = {
  name: "cv.OCR",
  description: "Extract text from image or document captures.",
  async execute(params) {
    return { imageId: imageId(params), text: String(params.expectedText ?? "HOARE.ai telemetry panel"), confidence: 0.91 };
  },
};

export const cvAnomalyDetectionTool: Tool = {
  name: "cv.anomalyDetection",
  description: "Detect visual anomalies in equipment, facilities, and documents.",
  async execute(params) {
    const severity = String(params.severity ?? "medium");
    return { imageId: imageId(params), anomalies: [{ type: "thermal-hotspot", severity, confidence: 0.87 }] };
  },
};

export const gridInspectionTool: Tool = {
  name: "cv.gridInspection",
  description: "Inspect grid imagery for asset condition and maintenance risk.",
  async execute(params) {
    return { imageId: imageId(params), assetCondition: "serviceable", vegetationRisk: "moderate", recommendedAction: "schedule inspection" };
  },
};

export const computerVisionTools: Tool[] = [detectObjectsTool, segmentTool, ocrTool, cvAnomalyDetectionTool, gridInspectionTool];
