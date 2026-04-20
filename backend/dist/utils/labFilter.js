"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLabFilter = getLabFilter;
exports.getLabIds = getLabIds;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function getLabFilter(labName) {
    if (!labName || labName === "all")
        return {};
    const lab = await prisma.laboratory.findFirst({
        where: { name: labName },
    });
    if (!lab)
        return {};
    return { laboratoryId: lab.id };
}
async function getLabIds(labName) {
    if (!labName || labName === "all")
        return null;
    const lab = await prisma.laboratory.findFirst({
        where: { name: labName },
    });
    return lab ? [lab.id] : null;
}
