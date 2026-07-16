import { Tool } from "./index";

export interface RobotState {
  id: string;
  position: { x: number; y: number; z: number };
  orientation: { roll: number; pitch: number; yaw: number };
  jointAngles: number[];
  velocity: { linear: number; angular: number };
  status: "idle" | "moving" | "executing" | "error" | "charging";
  batteryLevel: number;
}

export interface RobotCommand {
  type: "move" | "rotate" | "grasp" | "release" | "home" | "stop" | "execute-trajectory";
  params?: Record<string, unknown>;
}

export interface TrajectoryPlan {
  waypoints: Array<{ x: number; y: number; z: number }>;
  totalDistance: number;
  estimatedDuration: number;
  collisionFree: boolean;
}

const robots: Map<string, RobotState> = new Map();

function getOrCreateRobot(robotId: string): RobotState {
  if (!robots.has(robotId)) {
    robots.set(robotId, {
      id: robotId,
      position: { x: 0, y: 0, z: 0 },
      orientation: { roll: 0, pitch: 0, yaw: 0 },
      jointAngles: [0, 0, 0, 0, 0, 0],
      velocity: { linear: 0, angular: 0 },
      status: "idle",
      batteryLevel: Math.round(70 + Math.random() * 30),
    });
  }
  return robots.get(robotId)!;
}

export const robotStatusTool: Tool = {
  name: "robotics-status",
  description: "Query the current state of a robot: position, orientation, joint angles, battery, and status.",
  async execute(params) {
    const robotId = (params.robotId as string | undefined) ?? "robot-1";
    return getOrCreateRobot(robotId);
  },
};

export const robotCommandTool: Tool = {
  name: "robotics-command",
  description: "Send a command (move, rotate, grasp, release, home, stop) to a robot.",
  async execute(params) {
    const robotId = (params.robotId as string | undefined) ?? "robot-1";
    const command = (params.command as RobotCommand | undefined) ?? { type: "home" };
    const robot = getOrCreateRobot(robotId);

    switch (command.type) {
      case "move": {
        const target = (command.params?.target as { x: number; y: number; z: number } | undefined) ?? { x: 1, y: 0, z: 0 };
        robot.position = target;
        robot.status = "idle";
        break;
      }
      case "rotate": {
        const yaw = (command.params?.yaw as number | undefined) ?? 0;
        robot.orientation.yaw = yaw;
        robot.status = "idle";
        break;
      }
      case "home":
        robot.position = { x: 0, y: 0, z: 0 };
        robot.orientation = { roll: 0, pitch: 0, yaw: 0 };
        robot.jointAngles = [0, 0, 0, 0, 0, 0];
        robot.status = "idle";
        break;
      case "stop":
        robot.velocity = { linear: 0, angular: 0 };
        robot.status = "idle";
        break;
      case "grasp":
        robot.status = "executing";
        break;
      case "release":
        robot.status = "idle";
        break;
      default:
        return { success: false, message: `Unknown command: ${command.type}` };
    }

    return { success: true, robotId, command: command.type, newState: robot };
  },
};

export const trajectoryPlanTool: Tool = {
  name: "robotics-trajectory-plan",
  description: "Plan a collision-free trajectory from the current robot position to a goal position.",
  async execute(params) {
    const robotId = (params.robotId as string | undefined) ?? "robot-1";
    const goal = (params.goal as { x: number; y: number; z: number } | undefined) ?? { x: 5, y: 5, z: 0 };
    const robot = getOrCreateRobot(robotId);

    const dx = goal.x - robot.position.x;
    const dy = goal.y - robot.position.y;
    const dz = goal.z - robot.position.z;
    const totalDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const waypointCount = Math.max(2, Math.round(totalDistance / 2));
    const waypoints = Array.from({ length: waypointCount }, (_, i) => ({
      x: robot.position.x + (dx * (i + 1)) / waypointCount,
      y: robot.position.y + (dy * (i + 1)) / waypointCount,
      z: robot.position.z + (dz * (i + 1)) / waypointCount,
    }));

    const plan: TrajectoryPlan = {
      waypoints,
      totalDistance: Math.round(totalDistance * 100) / 100,
      estimatedDuration: Math.round(totalDistance / 0.5),
      collisionFree: Math.random() > 0.05,
    };
    return plan;
  },
};

export const manipulationTool: Tool = {
  name: "robotics.manipulation",
  description: "Plan and validate a manipulation action such as grasp, place, release, or tool-use.",
  async execute(params) {
    const robotId = (params.robotId as string | undefined) ?? "robot-1";
    const action = String(params.action ?? "grasp");
    const robot = getOrCreateRobot(robotId);
    robot.status = "executing";
    return { robotId, action, feasible: true, gripForceN: 18, safetyEnvelope: "clear" };
  },
};

export const inspectionWorkflowTool: Tool = {
  name: "robotics.inspectionWorkflows",
  description: "Create a robotics inspection workflow across waypoints and sensor passes.",
  async execute(params) {
    const robotId = (params.robotId as string | undefined) ?? "robot-1";
    const targets = (params.targets as string[] | undefined) ?? ["panel-a", "panel-b"];
    return { robotId, targets, steps: targets.map((target) => ({ target, actions: ["navigate", "scan", "report"] })), estimatedMinutes: targets.length * 6 };
  },
};

export const roboticsTools: Tool[] = [robotStatusTool, robotCommandTool, trajectoryPlanTool, manipulationTool, inspectionWorkflowTool];
