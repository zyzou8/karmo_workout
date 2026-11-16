/** Converts the AI's lightweight markdown (headings, bold, lists, tables) into HTML. */
export function formatAIResponse(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^\s*:?-+:?\s*$/.test(c))) return ''
      return '<tr>' + cells.map(c => `<td class="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm">${c.trim()}</td>`).join('') + '</tr>'
    })
    .replace(/(<tr>.*<\/tr>\n*)+/g, '<table class="w-full border-collapse my-3">$&</table>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .trim()
}

export interface AIResponseSection {
  heading: string | null
  level: 2 | 3
  body: string
  children: AIResponseSection[]
}

/** Splits markdown into `##` sections, each holding its intro text and `###` subsections. */
export function splitAIResponse(text: string): AIResponseSection[] {
  const sections: AIResponseSection[] = []
  let current: AIResponseSection = { heading: null, level: 2, body: '', children: [] }
  let target: AIResponseSection = current

  for (const line of text.split('\n')) {
    const h2 = line.match(/^## (.+)$/)
    const h3 = line.match(/^### (.+)$/)
    if (h2) {
      if (current.heading !== null || current.body.trim() || current.children.length) sections.push(current)
      current = { heading: h2[1], level: 2, body: '', children: [] }
      target = current
    } else if (h3) {
      target = { heading: h3[1], level: 3, body: '', children: [] }
      current.children.push(target)
    } else {
      target.body += line + '\n'
    }
  }
  if (current.heading !== null || current.body.trim() || current.children.length) sections.push(current)
  return sections
}
