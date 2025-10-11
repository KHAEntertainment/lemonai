<template>
  <div class="basic-settings">
    <h2>{{ $t(`setting.basic.title`) }}</h2>

    <div class="setting-item">
      <div class="label">Show Social Footer Bar</div>
      <a-switch :checked="settings.footerVisible" @change="onToggleFooter" />
    </div>

    <div class="setting-item">
      <div class="label">Site Name</div>
      <a-input v-model:value="siteNameDraft" placeholder="Enter site name" @change="applySiteName" />
    </div>

    <div class="setting-item">
      <div class="label">Logo</div>
      <div class="upload-controls">
        <a-input v-model:value="logoDraft" placeholder="https://.../logo.png or /uploads/..." @change="applyLogo" />
        <a-upload
          :before-upload="handleLogoUpload"
          :show-upload-list="false"
          accept="image/*"
        >
          <a-button :loading="logoUploading" style="margin-top: 8px">
            <UploadOutlined /> Upload Logo
          </a-button>
        </a-upload>
        <img v-if="logoDraft" :src="logoDraft" alt="logo preview" class="preview-img" />
      </div>
    </div>

    <div class="setting-item">
      <div class="label">Favicon</div>
      <div class="upload-controls">
        <a-input v-model:value="faviconDraft" placeholder="https://.../favicon.ico or /uploads/..." @change="applyFavicon" />
        <a-upload
          :before-upload="handleFaviconUpload"
          :show-upload-list="false"
          accept="image/*"
        >
          <a-button :loading="faviconUploading" style="margin-top: 8px">
            <UploadOutlined /> Upload Favicon
          </a-button>
        </a-upload>
        <img v-if="faviconDraft" :src="faviconDraft" alt="favicon preview" class="preview-img" />
      </div>
    </div>

    <langService/>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { useSettingsStore } from '@/store/modules/settings'
import langService from '@/components/lang/index.vue'
import axios from 'axios'

const settings = useSettingsStore()

const siteNameDraft = ref(settings.siteName)
const logoDraft = ref(settings.logoUrl)
const faviconDraft = ref(settings.faviconUrl)
const logoUploading = ref(false)
const faviconUploading = ref(false)

const onToggleFooter = (val) => settings.setFooterVisible(val)

const applySiteName = () => settings.setSiteName(siteNameDraft.value)
const applyLogo = () => settings.setLogoUrl(logoDraft.value)
const applyFavicon = () => settings.setFaviconUrl(faviconDraft.value)

const handleLogoUpload = async (file) => {
  logoUploading.value = true
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const baseURL = import.meta.env.VITE_SERVICE_URL || 'http://127.0.0.1:3000'
    const res = await axios.post(`${baseURL}/api/file/upload_public`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    console.log('Upload response:', res.data)
    if (res.data?.data?.url) {
      logoDraft.value = res.data.data.url
      settings.setLogoUrl(logoDraft.value)
      message.success('Logo uploaded successfully')
    } else {
      message.error('Upload succeeded but no URL returned')
    }
  } catch (error) {
    console.error('Logo upload failed:', error)
    message.error(error.response?.data?.msg || error.message || 'Failed to upload logo')
  } finally {
    logoUploading.value = false
  }
  return false // Prevent default upload behavior
}

const handleFaviconUpload = async (file) => {
  faviconUploading.value = true
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const baseURL = import.meta.env.VITE_SERVICE_URL || 'http://127.0.0.1:3000'
    const res = await axios.post(`${baseURL}/api/file/upload_public`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    console.log('Upload response:', res.data)
    if (res.data?.data?.url) {
      faviconDraft.value = res.data.data.url
      settings.setFaviconUrl(faviconDraft.value)
      message.success('Favicon uploaded successfully')
    } else {
      message.error('Upload succeeded but no URL returned')
    }
  } catch (error) {
    console.error('Favicon upload failed:', error)
    message.error(error.response?.data?.msg || error.message || 'Failed to upload favicon')
  } finally {
    faviconUploading.value = false
  }
  return false // Prevent default upload behavior
}

// Apply document.title and favicon changes reactively
watch(() => settings.siteName, (v) => { if (v) document.title = v })
watch(() => settings.faviconUrl, (v) => {
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  if (v) link.href = v
})
</script>

<style scoped>
.basic-settings {
  padding: 16px;
}
.setting-item {
  margin: 12px 0;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.label{ font-weight: 600; margin-bottom: 6px; }
.upload-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.preview-img {
  max-width: 100px;
  max-height: 100px;
  margin-top: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

@media screen and (max-width: 768px) {
  h2{
    display: none!important;
  }
  .basic-settings{
    padding: 0!important;
  }
}
</style>
