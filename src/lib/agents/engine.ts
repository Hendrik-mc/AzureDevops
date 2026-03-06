import { prisma } from "@/lib/db";
import type { AgentInput, AgentOutput, AgentType } from "@/types/agents";
import { finopsAgent } from "./finops-agent";
import { securityAgent } from "./security-agent";
import { reliabilityAgent } from "./reliability-agent";
import { architectureAgent } from "./architecture-agent";
import { complianceAgent } from "./compliance-agent";
import { vendorAccountabilityAgent } from "./vendor-accountability-agent";

export interface Agent {
  type: AgentType;
  analyze(input: AgentInput): Promise<AgentOutput>;
}

const agents: Record<AgentType, Agent> = {
  finops: finopsAgent,
  security: securityAgent,
  reliability: reliabilityAgent,
  architecture: architectureAgent,
  compliance: complianceAgent,
  "vendor-accountability": vendorAccountabilityAgent,
};

export async function runAgent(
  agentType: AgentType,
  input: AgentInput
): Promise<AgentOutput> {
  const agent = agents[agentType];
  if (!agent) throw new Error(`Unknown agent type: ${agentType}`);

  const run = await prisma.agentRun.create({
    data: {
      agentType,
      status: "running",
      input: JSON.stringify({ subscriptionId: input.subscriptionId }),
    },
  });

  try {
    const output = await agent.analyze(input);

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        output: JSON.stringify(output),
        completedAt: new Date(),
      },
    });

    return output;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        output: JSON.stringify({ error: errorMsg }),
        completedAt: new Date(),
      },
    });

    return {
      agentType,
      findings: [],
      summary: `Agent failed: ${errorMsg}`,
      analyzedAt: new Date().toISOString(),
      status: "failed",
      error: errorMsg,
    };
  }
}

export async function runAllAgents(input: AgentInput): Promise<AgentOutput[]> {
  const agentTypes = Object.keys(agents) as AgentType[];

  const results = await Promise.allSettled(
    agentTypes.map((type) => runAgent(type, input))
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      agentType: agentTypes[i],
      findings: [],
      summary: `Agent failed: ${result.reason?.message || "Unknown error"}`,
      analyzedAt: new Date().toISOString(),
      status: "failed" as const,
      error: result.reason?.message,
    };
  });
}
