// 紹介ツリーの構築・探索ユーティリティ
import type { Partner } from "./types";

export interface TreeNode {
  partner: Partner;
  depth: number;
  children: TreeNode[];
}

/** partnerId → Partner の索引を作る */
export function indexById(partners: Partner[]): Map<string, Partner> {
  return new Map(partners.map((p) => [p.id, p]));
}

/**
 * 指定パートナーから上方向（紹介元）へ最大 maxDepth 段たどる。
 * 返り値 [0] は本人、[1] は1段上、… の順。
 */
export function uplineChain(
  partnerId: string,
  byId: Map<string, Partner>,
  maxDepth = 3
): Partner[] {
  const chain: Partner[] = [];
  let current: string | null = partnerId;
  while (current && chain.length < maxDepth) {
    const node = byId.get(current);
    if (!node) break;
    chain.push(node);
    current = node.parentId;
  }
  return chain;
}

/**
 * rootId をルートとしたダウンライン・ツリーを構築する。
 * rootId を省略すると parentId === null の全ルートからフォレストを作る。
 */
export function buildTree(partners: Partner[], rootId?: string): TreeNode[] {
  const childrenOf = new Map<string | null, Partner[]>();
  for (const p of partners) {
    const key = p.parentId;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(p);
  }

  const make = (partner: Partner, depth: number): TreeNode => ({
    partner,
    depth,
    children: (childrenOf.get(partner.id) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .map((c) => make(c, depth + 1)),
  });

  if (rootId) {
    const byId = indexById(partners);
    const root = byId.get(rootId);
    return root ? [make(root, 0)] : [];
  }
  return (childrenOf.get(null) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .map((p) => make(p, 0));
}

/** ノード配下（自身を含む）の全パートナーID を平坦化して返す */
export function flattenIds(node: TreeNode): string[] {
  return [node.partner.id, ...node.children.flatMap(flattenIds)];
}

/** あるパートナーのダウンライン（自身を除く子孫）の ID 集合 */
export function downlineIds(
  partnerId: string,
  partners: Partner[]
): Set<string> {
  const tree = buildTree(partners, partnerId);
  if (tree.length === 0) return new Set();
  const all = flattenIds(tree[0]);
  return new Set(all.filter((id) => id !== partnerId));
}
