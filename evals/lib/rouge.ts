/**
 * ROUGE-L score: longest common subsequence based F1.
 * Used here for headline similarity — coarse, complementary to LLM-as-judge.
 * Returns 0-1.
 */
export function rougeL(generated: string, reference: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")  // strip accents for tokenization
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/).filter(Boolean);

  const g = tokenize(generated);
  const r = tokenize(reference);
  if (g.length === 0 || r.length === 0) return 0;

  const m = g.length, n = r.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = g[i - 1] === r[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const lcs = dp[m][n];
  const precision = lcs / m;
  const recall = lcs / n;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}
