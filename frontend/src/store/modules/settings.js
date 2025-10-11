import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    footerVisible: true,
    siteName: 'Lemon',
    logoUrl: '',
    faviconUrl: ''
  }),
  actions: {
    setFooterVisible(v) { this.footerVisible = !!v },
    setSiteName(v) { this.siteName = v || '' },
    setLogoUrl(v) { this.logoUrl = v || '' },
    setFaviconUrl(v) { this.faviconUrl = v || '' }
  },
  persist: true
});