import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getLabFilter(labName: string | undefined) {
  if (!labName || labName === "all") return {};

  const lab = await prisma.laboratory.findFirst({
    where: { name: labName },
  });
  if (!lab) return {};

  return { laboratoryId: lab.id };
}

export async function getLabIds(labName: string | undefined): Promise<string[] | null> {
  if (!labName || labName === "all") return null;

  const lab = await prisma.laboratory.findFirst({
    where: { name: labName },
  });
  return lab ? [lab.id] : null;
}