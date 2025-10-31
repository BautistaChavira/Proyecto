// src/ai/testAiClient.ts
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { identifyImageFromBuffer } from './ai/aiClient'

dotenv.config()

async function test() {
  const filePath = 'C:\\Users\\Palet\\Downloads\\Imagen de WhatsApp 2025-10-01 a las 20.29.18_a6d923ef.jpg'
  const buffer = fs.readFileSync(filePath)
  const result = await identifyImageFromBuffer(buffer, 'imagen.jpg', 'image/jpeg')
  console.log('✅ Resultado IA:', result)
}

test().catch(console.error)
