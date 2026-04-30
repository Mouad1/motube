import { NextResponse } from "next/server";

// GET /api/queue — retourne le statut des jobs BullMQ
// On importe dynamiquement pour éviter les erreurs si Redis n'est pas disponible
export async function GET() {
  try {
    const { getAllJobStatuses } = await import("../../../../pipeline/lib/queue");
    const jobs = await getAllJobStatuses();
    return NextResponse.json(jobs);
  } catch (err) {
    // Redis non disponible — retourner liste vide
    console.warn("Queue unavailable:", err);
    return NextResponse.json([]);
  }
}
