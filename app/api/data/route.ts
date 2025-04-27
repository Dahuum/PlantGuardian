import { NextResponse } from "next/server"

// Mock data for demonstration purposes
// In a real application, this would fetch data from your ESP32
export async function GET() {
  // Simulate some random sensor values
  const moisture = Math.floor(Math.random() * 1000)
  const light = Math.floor(Math.random() * 1000)
  const water = Math.floor(Math.random() * 100)
  const temperature = (Math.random() * 30 + 10).toFixed(1)
  const humidity = Math.floor(Math.random() * 100)

  // Determine status based on values
  const moistureStatus = moisture < 300 ? "DRY" : moisture < 700 ? "MOIST" : "WET"
  const lightStatus = light < 300 ? "DARK" : light < 700 ? "MEDIUM" : "BRIGHT"
  const waterStatus = water < 30 ? "LOW" : water < 70 ? "MEDIUM" : "HIGH"

  // Static servo position (would be stored/retrieved in a real app)
  const servo = 45

  // Create a raw data representation
  const raw = `Moisture:${moisture},${moistureStatus},Light:${light},${lightStatus},Water:${water},${waterStatus},Temp:${temperature},Humid:${humidity},Servo:${servo}`

  return NextResponse.json({
    moisture,
    moistureStatus,
    light,
    lightStatus,
    water,
    waterStatus,
    temperature,
    humidity,
    servo,
    raw,
    timestamp: new Date().toISOString(),
  })
}
