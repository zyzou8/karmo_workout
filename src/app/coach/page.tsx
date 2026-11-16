'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { PageHeader } from '@/components/PageHeader'
import { streamAnalysis } from '@/lib/api'
import { formatAIResponse } from '@/lib/formatAIResponse'
import {
  COACHES, ChatMessage, CoachId, CoachSettings, DEFAULT_COACH_SETTINGS,
  loadChat, loadCoachSettings, saveChat, saveCoachSettings,
} from '@/lib/coach'

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function CoachPage() {
  const { t, tList, locale } = useTranslation()
  const [settings, setSettings] = useState<CoachSettings>(DEFAULT_COACH_SETTINGS)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setSettings(loadCoachSettings())
    setMessages(loadChat())
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  const coach = COACHES.find(c => c.id === settings.coach) ?? COACHES[0]

  const pickCoach = (id: CoachId) => {
    const persona = COACHES.find(c => c.id === id) ?? COACHES[0]
    const next = { coach: id, sliders: persona.defaults }
    setSettings(next)
    saveCoachSettings(next)
  }

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || pending !== null) return
    const history: ChatMessage[] = [...messages, { role: 'user', text: question }]
    setMessages(history)
    setInput('')
    setError(null)
    setPending('')

    const fd = new FormData()
    fd.append('messages', JSON.stringify(history))
    fd.append('coach', settings.coach)
    fd.append('gentle', String(settings.sliders.gentle))
    fd.append('encourage', String(settings.sliders.encourage))
    fd.append('brevity', String(settings.sliders.brevity))
    fd.append('locale', locale)

    try {
      const answer = await streamAnalysis('/api/coach', fd, full => setPending(full))
      const next: ChatMessage[] = [...history, { role: 'model', text: answer.trim() }]
      setMessages(next)
      saveChat(next)
    } catch {
      setError(t('coach.error'))
      saveChat(history)
    } finally {
      setPending(null)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  const clear = () => {
    setMessages([])
    saveChat([])
    setError(null)
  }

  const bubble = (role: ChatMessage['role'], text: string, key: string | number) =>
    role === 'user' ? (
      <div key={key} className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-md bg-olive-800 dark:bg-sage-300 text-white dark:text-gray-900 px-4 py-2.5 text-[15px] whitespace-pre-wrap break-words">{text}</div>
      </div>
    ) : (
      <div key={key} className="flex gap-2 items-end">
        <span className="w-8 h-8 shrink-0 rounded-full bg-sage-300 text-base flex items-center justify-center" aria-hidden>{coach.emoji}</span>
        <div className="max-w-[85%] rounded-3xl rounded-bl-md bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 px-4 py-2.5 text-[15px] ai-response break-words"
          dangerouslySetInnerHTML={{ __html: `<p>${formatAIResponse(escapeHtml(text))}</p>` }} />
      </div>
    )

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title={t('coach.title')}
        actions={messages.length > 0 && (
          <button type="button" onClick={clear} className="px-3 py-1.5 rounded-full text-xs font-bold text-olive-700 dark:text-sage-300 hover:bg-gray-100 dark:hover:bg-gray-800">{t('coach.clear')}</button>
        )}
      />

      {/* Required disclaimer */}
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 pt-3">
        <p role="note" className="rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs px-3 py-2">
          ⚕︎ {t('coach.disclaimer')}
        </p>
      </div>

      {/* Coach picker */}
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 pt-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('coach.pickCoach')}</p>
          <Link href="/settings#coach" className="text-xs font-bold text-olive-600 dark:text-sage-300 hover:underline">{t('coach.adjust')} →</Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {COACHES.map(c => (
            <button key={c.id} type="button" onClick={() => pickCoach(c.id)} aria-pressed={settings.coach === c.id}
              className={`rounded-2xl px-3 py-2.5 text-left border transition-colors ${
                settings.coach === c.id
                  ? 'bg-olive-800 border-olive-800 text-white dark:bg-sage-300 dark:border-sage-300 dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200'
              }`}>
              <span className="font-display text-lg">{c.emoji} {c.name}</span>
              <span className={`block text-[11px] ${settings.coach === c.id ? 'opacity-80' : 'text-gray-500'}`}>{t(`coach.style.${c.id}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-4 space-y-3">
        {bubble('model', t(`coach.greeting.${coach.id}`), 'greeting')}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            {tList('coach.suggestions').map(s => (
              <button key={s} type="button" onClick={() => { setInput(s); inputRef.current?.focus() }}
                className="px-3 py-1.5 rounded-full text-sm bg-sage-300/40 dark:bg-sage-300/10 text-olive-800 dark:text-sage-200 border border-sage-300/60 dark:border-gray-800 hover:bg-sage-300/60">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => bubble(m.role, m.text, i))}
        {pending !== null && (pending ? bubble('model', pending, 'pending') : (
          <p className="pl-10 text-sm text-gray-500 animate-pulse">{t('coach.thinking')}</p>
        ))}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 pl-10">{error}</p>}
        <div ref={endRef} />
      </main>

      {/* Composer, sits above the tab bar */}
      <form onSubmit={onSubmit} className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-24 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-2">
          <div className="flex items-end gap-2 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg shadow-gray-900/5 p-2">
            <label htmlFor="coach-input" className="sr-only">{t('coach.placeholder')}</label>
            <textarea id="coach-input" ref={inputRef} rows={1} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input) } }}
              placeholder={t('coach.placeholder')}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none max-h-32" />
            <button type="submit" disabled={!input.trim() || pending !== null}
              className="h-10 px-4 rounded-full bg-olive-800 dark:bg-sage-300 text-white dark:text-gray-900 text-sm font-bold disabled:opacity-40">
              {t('coach.send')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
