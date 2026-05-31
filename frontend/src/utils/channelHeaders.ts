export type ChannelSource = 'ecommerce' | 'event' | 'store' | 'surface'

const channelHeaderClassBySource: Record<ChannelSource, string> = {
  ecommerce: 'channel-header-ecommerce',
  event: 'channel-header-event',
  store: 'channel-header-store',
  surface: 'channel-header-surface',
}

export function getChannelHeaderClass(source: string) {
  return channelHeaderClassBySource[source as ChannelSource]
}
