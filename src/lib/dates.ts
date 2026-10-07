import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const TZ = 'America/Sao_Paulo'

/** Data local (fuso de São Paulo) no formato 'yyyy-MM-dd'. */
export function hoje(agora: Date = new Date()): string {
  return formatInTimeZone(agora, TZ, 'yyyy-MM-dd')
}

export function addDias(data: string, n: number): string {
  return format(addDays(parseISO(data), n), 'yyyy-MM-dd')
}

export function diffDias(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b))
}

/** Dia ISO da semana: 1 = segunda ... 7 = domingo. */
export function diaSemana(data: string): number {
  const d = parseISO(data).getDay()
  return d === 0 ? 7 : d
}

/** Segunda-feira da semana que contém `data`. */
export function inicioSemana(data: string): string {
  return format(startOfWeek(parseISO(data), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function diasDaSemana(segunda: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDias(segunda, i))
}

export function inicioMes(data: string): string {
  return data.slice(0, 7) + '-01'
}

export function fmt(data: string, padrao = "d 'de' MMM"): string {
  return format(parseISO(data), padrao, { locale: ptBR })
}

/** Hora local 'HH:mm' de um timestamp ISO. */
export function horaLocal(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'HH:mm')
}

export function dataLocal(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd')
}

/** Converte data + hora locais (São Paulo) em ISO UTC. */
export function paraISO(data: string, hora: string): string {
  return fromZonedTime(`${data}T${hora.slice(0, 5)}:00`, TZ).toISOString()
}

export const NOMES_DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
