import type { PolicyDocumentChunk } from "./assistant-port";

export const PUBLIC_POLICY_CHUNKS: PolicyDocumentChunk[] = [
  {
    id: "chunk-eligibility-01",
    title: "Student Hostel Eligibility Criteria",
    category: "eligibility",
    content:
      "All actively enrolled undergraduate and postgraduate students with a verified institutional roll number are eligible to apply for on-campus accommodation. Priority is determined by academic year, permanent hometown transit distance (minimum 50 km cutoff), and valid scholarship or statutory reservation category.",
  },
  {
    id: "chunk-scoring-02",
    title: "Multi-Criteria Decision Analysis (MCDA) Scoring Formula",
    category: "rules",
    content:
      "Hostel bed allocations are determined by a composite score formula: S = 0.35*P + 0.25*C + 0.15*F + 0.15*D + 0.10*K. Where P is preference rank, C is roommate compatibility, F is floor/amenity alignment, D is hometown distance bonus, and K is academic merit percentile. High composite scores receive higher preference matching.",
  },
  {
    id: "chunk-roommate-03",
    title: "Roommate Compatibility & Mutual Deal-Breakers",
    category: "roommate",
    content:
      "Students who do not apply in pre-formed groups are matched using a 7-dimension compatibility vector (sleep schedule, study quietness, room tidiness, noise tolerance, guest visits, AC temperature, and smoking policy). Mutual deal-breakers (HC11) guarantee that students with conflicting zero-tolerance rules are never assigned to the same room.",
  },
  {
    id: "chunk-rules-04",
    title: "Hostel Curfew & Residential Conduct Rules",
    category: "rules",
    content:
      "Hostel gate curfew is strictly 22:00 IST on weekdays and 22:30 IST on weekends. Quiet hours are observed from 23:00 to 06:00 IST in all residential corridors. Day guests are permitted between 10:00 and 19:00 IST in common reception lounges only. Overnight guests without prior written warden authorization are prohibited.",
  },
  {
    id: "chunk-appeals-05",
    title: "Allocation Grievances & Appeals Process",
    category: "appeals",
    content:
      "Students may file a formal allocation appeal within 72 hours of provisional list publication. Legitimate grounds for appeal include documented medical conditions (e.g. chronic asthma requiring ground floor), physical mobility accessibility needs, or irreconcilable roommate conflicts. Appeals are adjudicated under a strict 72-hour SLA by the Chief Warden and Dean committee.",
  },
  {
    id: "chunk-drafts-06",
    title: "Draft Allotments & Maker-Checker Approval",
    category: "timelines",
    content:
      "Following the allocation algorithm run, results are placed in an unapproved 'Draft Allotment' state. Wardens review bed maps and may apply manual overrides for exceptional reasons. Publishing is protected by a 4-layer Maker-Checker gate: Chief Warden formal approval is strictly required before provisional publication.",
  },
  {
    id: "chunk-movein-07",
    title: "Move-In Check-In & Letter Verification",
    category: "faq",
    content:
      "Once results are published, students can download their official allotment letter from /room. Each letter contains an Ed25519 digitally signed QR code. Caretakers and security scan this QR code at campus entry to verify authenticity offline or via /verify. Bring student ID, allotment letter, and medical fitness clearance.",
  },
  {
    id: "chunk-waitlist-08",
    title: "Dynamic Waitlist & Bed Vacations",
    category: "faq",
    content:
      "Unallocated applicants are placed on an ordered waitlist sorted by priority score. When an allocated resident withdraws, cancels admission, or fails to report, the bed is marked vacated and the top feasible waitlisted candidate is promoted automatically under institutional auto-confirm policy.",
  },
];

/**
 * Lightweight in-memory TF-IDF vector search over public policy chunks.
 */
export class PolicyVectorStore {
  private chunks: PolicyDocumentChunk[];

  constructor(chunks: PolicyDocumentChunk[] = PUBLIC_POLICY_CHUNKS) {
    this.chunks = chunks;
  }

  /**
   * Tokenizes text into normalized lowercase alphanumeric terms.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  /**
   * Searches public policy documents returning the top K matching chunks.
   */
  search(query: string, topK = 3): PolicyDocumentChunk[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return this.chunks.slice(0, topK);
    }

    const scored = this.chunks.map((chunk) => {
      const docTokens = this.tokenize(`${chunk.title} ${chunk.content} ${chunk.category}`);
      let score = 0;

      for (const qTerm of queryTokens) {
        // Term frequency match
        const matches = docTokens.filter((dTerm) => dTerm === qTerm).length;
        if (matches > 0) {
          score += 1 + Math.log(matches);
        } else if (docTokens.some((dTerm) => dTerm.includes(qTerm) || qTerm.includes(dTerm))) {
          score += 0.5; // Substring partial match
        }
      }

      return {
        ...chunk,
        score,
      };
    });

    return scored
      .filter((item) => (item.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, topK);
  }
}
