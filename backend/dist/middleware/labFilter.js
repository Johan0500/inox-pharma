"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectLabFilter = injectLabFilter;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Middleware qui injecte le filtre labo dans req
async function injectLabFilter(req, res, next) {
    const labName = req.headers["x-lab"];
    if (!labName || labName === "all" || req.user?.role === "ADMIN") {
        req.labFilter = null;
        req.labIds = null;
        return next();
    }
    try {
        const lab = await prisma.laboratory.findFirst({
            where: { name: labName },
        });
        req.labFilter = lab ? { laboratoryId: lab.id } : null;
        req.labIds = lab ? [lab.id] : null;
    }
    catch {
        req.labFilter = null;
        req.labIds = null;
    }
    next();
}
