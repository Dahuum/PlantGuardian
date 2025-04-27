"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Droplet,
  Sun,
  Thermometer,
  RefreshCw,
  Play,
  Pause,
  Waves,
  Leaf,
  Info,
  Calendar,
  MapPin,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface SensorData {
  moisture: number | null
  moistureStatus: string | null
  light: number | null
  lightStatus: string | null
  water: number | null
  waterStatus: string | null
  temperature: number | null
  humidity: number | null
  servo: number | null
  raw: string | null
  timestamp: string
}

interface Plant {
  id: string
  name: string
  location: string
  type: string
  image: string
  lastWatered?: string
  health?: "good" | "average" | "poor"
  description?: string
  careInstructions?: string
  dateAdded?: string
}

export default function PlantDashboard() {
  const params = useParams()
  const router = useRouter()
  const plantId = params.id as string

  const [plant, setPlant] = useState<Plant | null>(null)
  const [data, setData] = useState<SensorData>({
    moisture: null,
    moistureStatus: null,
    light: null,
    lightStatus: null,
    water: null,
    waterStatus: null,
    temperature: null,
    humidity: null,
    servo: null,
    raw: null,
    timestamp: new Date().toISOString(),
  })

  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(2000)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")

  // Fetch plant data
  useEffect(() => {
    // In a real app, this would fetch from an API
    const samplePlants: Plant[] = [
      {
        id: "plant-1",
        name: "Aloe Vera",
        location: "Tower A, Floor 3",
        type: "Succulent",
        image: "/plants/aloe.jpg",
        lastWatered: "2 days ago",
        health: "good",
        description:
          "Aloe vera is a succulent plant species of the genus Aloe. It's widely used for decorative purposes and grows successfully indoors as a potted plant.",
        careInstructions:
          "Water deeply but infrequently, about every 3 weeks. Place in bright, indirect sunlight. Use well-draining soil.",
        dateAdded: "2023-10-15",
      },
      {
        id: "plant-2",
        name: "Peace Lily",
        location: "Residence Hall, Room 204",
        type: "Flowering",
        image: "/plants/peace-lily.jpg",
        lastWatered: "1 day ago",
        health: "good",
        description:
          "The peace lily is a popular indoor plant known for its ability to purify air and its beautiful white flowers.",
        careInstructions:
          "Keep soil moist but not soggy. Prefers low to medium light. Mist occasionally to increase humidity.",
        dateAdded: "2023-11-02",
      },
      {
        id: "plant-3",
        name: "Snake Plant",
        location: "Tower B, Floor 5",
        type: "Succulent",
        image: "/plants/snake-plant.jpg",
        lastWatered: "5 days ago",
        health: "average",
        description:
          "Snake plants are hardy succulents with stiff, upright leaves. They're excellent air purifiers and very low maintenance.",
        careInstructions:
          "Water only when soil is completely dry. Tolerates low light but prefers indirect sunlight. Avoid overwatering.",
        dateAdded: "2023-09-20",
      },
      {
        id: "plant-4",
        name: "Monstera",
        location: "Residence Hall, Lobby",
        type: "Tropical",
        image: "/plants/monstera.jpg",
        lastWatered: "3 days ago",
        health: "poor",
        description:
          "Monstera deliciosa is a species of flowering plant native to tropical forests of southern Mexico, known for its large, perforated leaves.",
        careInstructions:
          "Water when top inch of soil is dry. Prefers bright, indirect light. Enjoys high humidity and occasional misting.",
        dateAdded: "2023-12-05",
      },
    ]

    const foundPlant = samplePlants.find((p) => p.id === plantId)
    if (foundPlant) {
      setPlant(foundPlant)
    } else {
      // Plant not found, redirect to home
      router.push("/")
    }
  }, [plantId, router])

  const fetchData = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/data")
      const newData = await response.json()
      setData(newData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const setServo = async (position: number) => {
    try {
      await fetch("/servo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ position }),
      })

      // Update the displayed servo value immediately for better UX
      setData((prev) => ({ ...prev, servo: position }))

      // Refresh all data after a short delay
      setTimeout(fetchData, 1000)
    } catch (error) {
      console.error("Error setting servo position:", error)
    }
  }

  const toggleAutoRefresh = () => {
    setIsAutoRefreshing(!isAutoRefreshing)
  }

  useEffect(() => {
    // Initial data fetch
    fetchData()

    // Start auto-refresh by default
    setIsAutoRefreshing(true)

    return () => {
      // Cleanup
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (isAutoRefreshing) {
      timer = setInterval(fetchData, refreshInterval)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isAutoRefreshing, refreshInterval])

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-600"

    switch (status) {
      case "DRY":
      case "DARK":
      case "LOW":
        return "bg-red-100 text-red-700"
      case "MOIST":
      case "MEDIUM":
        return "bg-amber-100 text-amber-700"
      case "WET":
      case "BRIGHT":
      case "HIGH":
        return "bg-emerald-100 text-emerald-700"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (!plant) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-emerald-600 animate-pulse">Loading plant data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-green-50">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-[url('/leaf-pattern.svg')] bg-repeat-x"></div>
        <div className="absolute bottom-0 left-0 w-full h-64 bg-[url('/leaf-pattern.svg')] bg-repeat-x transform rotate-180"></div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-6 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plants
        </Button>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Plant Image and Basic Info */}
          <div className="w-full md:w-1/3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl overflow-hidden shadow-md border border-emerald-100"
            >
              <div className="h-64 overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${plant.image})` }}
                ></div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-emerald-800">{plant.name}</h1>
                    <p className="text-emerald-600">{plant.type}</p>
                  </div>
                  <Badge
                    className={cn(
                      plant.health === "good" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                      plant.health === "average" && "bg-amber-100 text-amber-700 hover:bg-amber-200",
                      plant.health === "poor" && "bg-red-100 text-red-700 hover:bg-red-200",
                    )}
                  >
                    {plant.health === "good" && "Healthy"}
                    {plant.health === "average" && "Needs Attention"}
                    {plant.health === "poor" && "Critical"}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-emerald-700">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{plant.location}</span>
                  </div>
                  {plant.lastWatered && (
                    <div className="flex items-center text-emerald-700">
                      <Droplet className="h-4 w-4 mr-2" />
                      <span>Last watered: {plant.lastWatered}</span>
                    </div>
                  )}
                  {plant.dateAdded && (
                    <div className="flex items-center text-emerald-700">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Added: {new Date(plant.dateAdded).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sensor Data and Controls */}
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800"
                >
                  <Leaf className="mr-2 h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="info"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800"
                >
                  <Info className="mr-2 h-4 w-4" />
                  Plant Info
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-emerald-800">Sensor Readings</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={fetchData}
                      disabled={isRefreshing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>

                    <Button
                      size="sm"
                      onClick={toggleAutoRefresh}
                      variant={isAutoRefreshing ? "destructive" : "outline"}
                      className={
                        isAutoRefreshing
                          ? ""
                          : "border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      }
                    >
                      {isAutoRefreshing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                      {isAutoRefreshing ? "Stop Auto" : "Auto Refresh"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Soil Moisture Card */}
                  <Card className="border-emerald-100">
                    <CardHeader className="bg-emerald-50 pb-2">
                      <CardTitle className="flex items-center text-emerald-800">
                        <Droplet className="mr-2 h-5 w-5 text-emerald-600" />
                        Soil Moisture
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-3xl font-bold text-emerald-800">
                          {data.moisture !== null ? data.moisture : "--"}
                        </span>
                        <Badge className={getStatusColor(data.moistureStatus)}>
                          {data.moistureStatus || "Unknown"}
                        </Badge>
                      </div>
                      <Progress
                        value={data.moisture !== null ? Math.min(100, (data.moisture / 1000) * 100) : 0}
                        className="h-2 mt-2"
                      />
                      <p className="text-xs text-emerald-600 mt-2">
                        {data.moistureStatus === "DRY" && "Plant needs water soon"}
                        {data.moistureStatus === "MOIST" && "Moisture level is optimal"}
                        {data.moistureStatus === "WET" && "Soil is well saturated"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Light Level Card */}
                  <Card className="border-amber-100">
                    <CardHeader className="bg-amber-50 pb-2">
                      <CardTitle className="flex items-center text-amber-800">
                        <Sun className="mr-2 h-5 w-5 text-amber-600" />
                        Light Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-3xl font-bold text-amber-800">
                          {data.light !== null ? data.light : "--"}
                        </span>
                        <Badge className={getStatusColor(data.lightStatus)}>{data.lightStatus || "Unknown"}</Badge>
                      </div>
                      <Progress
                        value={data.light !== null ? Math.min(100, (data.light / 1000) * 100) : 0}
                        className="h-2 mt-2 bg-amber-100"
                        indicatorColor="bg-amber-500"
                      />
                      <p className="text-xs text-amber-600 mt-2">
                        {data.lightStatus === "DARK" && "Plant needs more light"}
                        {data.lightStatus === "MEDIUM" && "Light level is adequate"}
                        {data.lightStatus === "BRIGHT" && "Light conditions are excellent"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Water Level Card */}
                  <Card className="border-blue-100">
                    <CardHeader className="bg-blue-50 pb-2">
                      <CardTitle className="flex items-center text-blue-800">
                        <Waves className="mr-2 h-5 w-5 text-blue-600" />
                        Water Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-3xl font-bold text-blue-800">
                          {data.water !== null ? data.water : "--"}
                        </span>
                        <Badge className={getStatusColor(data.waterStatus)}>{data.waterStatus || "Unknown"}</Badge>
                      </div>
                      <Progress
                        value={data.water !== null ? data.water : 0}
                        className="h-2 mt-2 bg-blue-100"
                        indicatorColor="bg-blue-500"
                      />
                      <p className="text-xs text-blue-600 mt-2">
                        {data.waterStatus === "LOW" && "Water reservoir needs refilling"}
                        {data.waterStatus === "MEDIUM" && "Water level is adequate"}
                        {data.waterStatus === "HIGH" && "Water reservoir is well filled"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Temperature & Humidity Card */}
                  <Card className="border-purple-100">
                    <CardHeader className="bg-purple-50 pb-2">
                      <CardTitle className="flex items-center text-purple-800">
                        <Thermometer className="mr-2 h-5 w-5 text-purple-600" />
                        Climate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-purple-600 mb-1">Temperature</div>
                          <div className="text-2xl font-bold text-purple-800">
                            {data.temperature !== null ? `${data.temperature}°C` : "--"}
                          </div>
                          <Progress
                            value={data.temperature !== null ? Math.min(100, ((data.temperature - 10) / 30) * 100) : 0}
                            className="h-2 mt-2 bg-purple-100"
                            indicatorColor="bg-gradient-to-r from-blue-500 to-red-500"
                          />
                        </div>
                        <div>
                          <div className="text-sm text-purple-600 mb-1">Humidity</div>
                          <div className="text-2xl font-bold text-purple-800">
                            {data.humidity !== null ? `${data.humidity}%` : "--"}
                          </div>
                          <Progress
                            value={data.humidity !== null ? data.humidity : 0}
                            className="h-2 mt-2 bg-purple-100"
                            indicatorColor="bg-blue-500"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-100">
                  <CardHeader className="bg-slate-50 pb-2">
                    <CardTitle className="flex items-center text-slate-800">
                      <Info className="mr-2 h-5 w-5 text-slate-600" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Last updated: {formatTimestamp(data.timestamp)}</div>
                  </CardContent>
                </Card>
                <Card className="border-purple-100">
                  <CardHeader className="bg-purple-50 pb-2">
                    <CardTitle className="flex items-center text-purple-800">
                      <Sparkles className="mr-2 h-5 w-5 text-purple-600" />
                      AI Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {data.moisture !== null && (
                        <div className="flex items-start gap-3">
                          <div className="bg-emerald-100 p-2 rounded-full">
                            <Droplet className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-emerald-800">
                              {data.moistureStatus === "DRY" && "Water your plant soon"}
                              {data.moistureStatus === "MOIST" && "Moisture level is optimal"}
                              {data.moistureStatus === "WET" && "Hold off on watering"}
                            </h4>
                            <p className="text-sm text-emerald-600 mt-1">
                              {data.moistureStatus === "DRY" &&
                                `${plant.name} is getting dry. Consider watering in the next 1-2 days for optimal growth.`}
                              {data.moistureStatus === "MOIST" &&
                                `${plant.name} has ideal soil moisture. Continue your current watering schedule.`}
                              {data.moistureStatus === "WET" &&
                                `${plant.name}'s soil is quite wet. Wait until the top inch of soil feels dry before watering again.`}
                            </p>
                          </div>
                        </div>
                      )}

                      {data.light !== null && (
                        <div className="flex items-start gap-3">
                          <div className="bg-amber-100 p-2 rounded-full">
                            <Sun className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-amber-800">
                              {data.lightStatus === "DARK" && "Increase light exposure"}
                              {data.lightStatus === "MEDIUM" && "Light level is adequate"}
                              {data.lightStatus === "BRIGHT" && "Light conditions are excellent"}
                            </h4>
                            <p className="text-sm text-amber-600 mt-1">
                              {data.lightStatus === "DARK" &&
                                `${plant.name} needs more light. Consider moving it to a brighter location or adding supplemental lighting.`}
                              {data.lightStatus === "MEDIUM" &&
                                `${plant.name} is receiving adequate light. Monitor for any signs of stretching toward light sources.`}
                              {data.lightStatus === "BRIGHT" &&
                                `${plant.name} is receiving excellent light. This is ideal for healthy growth and development.`}
                            </p>
                          </div>
                        </div>
                      )}

                      {data.temperature !== null && data.humidity !== null && (
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Thermometer className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-800">
                              {data.temperature < 15 && "Temperature is too low"}
                              {data.temperature >= 15 && data.temperature <= 28 && "Climate conditions are good"}
                              {data.temperature > 28 && "Temperature is too high"}
                            </h4>
                            <p className="text-sm text-blue-600 mt-1">
                              {data.temperature < 15 &&
                                `${plant.name} may be too cold. Most plants prefer temperatures above 15°C (59°F).`}
                              {data.temperature >= 15 &&
                                data.temperature <= 28 &&
                                data.humidity >= 40 &&
                                data.humidity <= 60 &&
                                `${plant.name} is in an ideal environment with good temperature and humidity levels.`}
                              {data.temperature > 28 &&
                                `${plant.name} may be too warm. Consider moving to a cooler location or improving air circulation.`}
                              {(data.humidity < 40 || data.humidity > 60) &&
                                data.temperature >= 15 &&
                                data.temperature <= 28 &&
                                `Humidity is ${data.humidity < 40 ? "low" : "high"}. Consider ${data.humidity < 40 ? "using a humidifier or misting regularly" : "improving air circulation"}.`}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 text-sm text-purple-600">
                        <p className="italic">
                          AI analysis based on current sensor readings and {plant.type} plant requirements.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="info" className="space-y-6">
                <Card className="border-emerald-100">
                  <CardHeader className="bg-emerald-50 pb-2">
                    <CardTitle className="flex items-center text-emerald-800">
                      <Leaf className="mr-2 h-5 w-5 text-emerald-600" />
                      About This Plant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-emerald-800 mb-4">{plant.description}</p>
                    <h3 className="font-medium text-emerald-800 mb-2">Care Instructions</h3>
                    <p className="text-emerald-700">{plant.careInstructions}</p>
                  </CardContent>
                </Card>

                <Card className="border-amber-100">
                  <CardHeader className="bg-amber-50 pb-2">
                    <CardTitle className="flex items-center text-amber-800">
                      <Sun className="mr-2 h-5 w-5 text-amber-600" />
                      Optimal Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h3 className="font-medium text-amber-800 mb-2">Moisture</h3>
                        <p className="text-amber-700">
                          {plant.type === "Succulent" && "Keep soil dry, water sparingly"}
                          {plant.type === "Tropical" && "Keep soil consistently moist"}
                          {plant.type === "Flowering" && "Medium moisture, allow to dry between watering"}
                          {!["Succulent", "Tropical", "Flowering"].includes(plant.type || "") &&
                            "Water when top inch of soil is dry"}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-amber-800 mb-2">Light</h3>
                        <p className="text-amber-700">
                          {plant.type === "Succulent" && "Bright, direct sunlight"}
                          {plant.type === "Tropical" && "Bright, indirect light"}
                          {plant.type === "Flowering" && "Medium to bright indirect light"}
                          {!["Succulent", "Tropical", "Flowering"].includes(plant.type || "") &&
                            "Medium indirect light"}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-amber-800 mb-2">Temperature</h3>
                        <p className="text-amber-700">
                          {plant.type === "Succulent" && "18-32°C (65-90°F)"}
                          {plant.type === "Tropical" && "18-29°C (65-85°F)"}
                          {plant.type === "Flowering" && "16-24°C (60-75°F)"}
                          {!["Succulent", "Tropical", "Flowering"].includes(plant.type || "") && "18-24°C (65-75°F)"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
