// src/ai/testAiClient.ts
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { identifyImageFromBuffer } from './ai/aiClient'

dotenv.config()

async function test() {
  const filePath = 'C:\\Users\\Palet\\Downloads\\dog1.jpeg'
  const buffer = fs.readFileSync(filePath)
  const result = await identifyImageFromBuffer(buffer, 'imagen.jpg', 'image/jpeg')
  console.log('✅ Resultado IA:', result)
}

test().catch(console.error)
