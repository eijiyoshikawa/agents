// 採用ページのHTMLから「未経験応募可能な求人」の有無を判定する。
// 精度優先: まず否定表現（未経験不可・応募お断り等）を除去してから肯定文脈をマッチさせる。
const NEGATIVE_PATTERN = /未経験(者)?(の方)?[^\n。、]{0,8}(不可|NG|ＮＧ|ご遠慮|お断り|できません|受け付けて(おり|い)ません)/g;

const POSITIVE_PATTERNS: RegExp[] = [
  /未経験(者)?(の方)?[^\n。、]{0,6}(歓迎|OK|ＯＫ|大歓迎|活躍|採用|応募)/,
  /未経験(でも|から|の方も)/,
  /経験不問/,
  /経験(は|を)問いません/,
  /無資格(OK|ＯＫ|歓迎|でも)/,
];

/** HTML(生文字列)に未経験可の記載があるか。SPAでもJSON内テキストを拾えるよう生HTMLを走査する。 */
export function judgeNoExperience(html: string): "あり" | "なし" {
  const cleaned = html.replace(NEGATIVE_PATTERN, "");
  return POSITIVE_PATTERNS.some((re) => re.test(cleaned)) ? "あり" : "なし";
}
