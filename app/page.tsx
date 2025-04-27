"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Leaf, MapPin, Activity, Clock, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface Plant {
  id: string
  name: string
  location: string
  type: string
  image: string
  lastWatered?: string
  health?: "good" | "average" | "poor"
}

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

export default function PlantManager() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPlant, setNewPlant] = useState<Partial<Plant>>({
    name: "",
    location: "",
    type: "Succulent",
  })

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
  const [showRawData, setShowRawData] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")

  // Load plants on initial render
  useEffect(() => {
    // In a real app, this would fetch from an API or local storage
    const samplePlants: Plant[] = [
      {
        id: "plant-1",
        name: "Aloe Vera",
        location: "Tower A, Floor 3",
        type: "Succulent",
        image: "/plants/aloe.jpg",
        lastWatered: "2 days ago",
        health: "good",
      },
      {
        id: "plant-2",
        name: "Peace Lily",
        location: "Residence Hall, Room 204",
        type: "Flowering",
        image: "/plants/peace-lily.jpg",
        lastWatered: "1 day ago",
        health: "good",
      },
      {
        id: "plant-3",
        name: "Snake Plant",
        location: "Tower B, Floor 5",
        type: "Succulent",
        image: "/plants/snake-plant.jpg",
        lastWatered: "5 days ago",
        health: "average",
      },
      {
        id: "plant-4",
        name: "Monstera",
        location: "Residence Hall, Lobby",
        type: "Tropical",
        image: "/plants/monstera.jpg",
        lastWatered: "3 days ago",
        health: "poor",
      },
    ]
    setPlants(samplePlants)
  }, [])

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
    if (!status) return "bg-gray-800 text-gray-300"

    switch (status) {
      case "DRY":
      case "DARK":
      case "LOW":
        return "bg-red-900/50 text-red-300"
      case "MOIST":
      case "MEDIUM":
        return "bg-yellow-900/50 text-yellow-300"
      case "WET":
      case "BRIGHT":
      case "HIGH":
        return "bg-green-900/50 text-green-300"
      default:
        return "bg-gray-800 text-gray-300"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleAddPlant = () => {
    if (!newPlant.name || !newPlant.location) return

    const plant: Plant = {
      id: `plant-${Date.now()}`,
      name: newPlant.name,
      location: newPlant.location,
      type: newPlant.type || "Unknown",
      image: "/plants/default-plant.jpg",
      lastWatered: "Never",
      health: "good",
    }

    setPlants([...plants, plant])
    setNewPlant({ name: "", location: "", type: "Succulent" })
    setShowAddModal(false)
  }

  const filteredPlants = plants.filter(
    (plant) =>
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Calculate percentage values for visualizations
  const moisturePercent = data.moisture !== null ? Math.min(100, Math.max(0, data.moisture / 10)) : 0
  const lightPercent = data.light !== null ? Math.min(100, Math.max(0, data.light / 10)) : 0
  const waterPercent = data.water !== null ? Math.min(100, Math.max(0, data.water)) : 0
  const temperaturePercent =
    data.temperature !== null ? Math.min(100, Math.max(0, ((data.temperature - 10) / 30) * 100)) : 0
  const humidityPercent = data.humidity !== null ? data.humidity : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-[url('/leaf-pattern.svg')] bg-repeat-x"></div>
        <div className="absolute bottom-0 left-0 w-full h-64 bg-[url('/leaf-pattern.svg')] bg-repeat-x transform rotate-180"></div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-emerald-800 mb-2 font-display">Plant Guardian</h1>
          <p className="text-emerald-600 max-w-md mx-auto">
            Monitor and care for your plants with precision using IoT sensors
          </p>
        </header>

        {/* Add this right after the header section and before the search/add plant section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-emerald-800">Total Plants</h3>
              <div className="bg-emerald-100 p-2 rounded-full">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-800 mt-2">{plants.length}</p>
            <p className="text-sm text-emerald-600 mt-1">
              Across {Array.from(new Set(plants.map((p) => p.location.split(",")[0]))).length} locations
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-emerald-800">Health Status</h3>
              <div className="bg-amber-100 p-2 rounded-full">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-600">Healthy</span>
                  <span className="text-emerald-800 font-medium">
                    {plants.filter((p) => p.health === "good").length}
                  </span>
                </div>
                <Progress
                  value={(plants.filter((p) => p.health === "good").length / plants.length) * 100}
                  className="h-2"
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-600">Attention</span>
                  <span className="text-amber-800 font-medium">
                    {plants.filter((p) => p.health === "average").length}
                  </span>
                </div>
                <Progress
                  value={(plants.filter((p) => p.health === "average").length / plants.length) * 100}
                  className="h-2 bg-amber-100"
                  indicatorColor="bg-amber-500"
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-600">Critical</span>
                  <span className="text-red-800 font-medium">{plants.filter((p) => p.health === "poor").length}</span>
                </div>
                <Progress
                  value={(plants.filter((p) => p.health === "poor").length / plants.length) * 100}
                  className="h-2 bg-red-100"
                  indicatorColor="bg-red-500"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-emerald-800">Recent Activity</h3>
              <div className="bg-blue-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              <li className="text-sm">
                <span className="text-blue-600">Today, 10:45 AM</span>
                <p className="text-emerald-800">Watered Peace Lily</p>
              </li>
              <li className="text-sm">
                <span className="text-blue-600">Yesterday, 4:30 PM</span>
                <p className="text-emerald-800">Added new plant: Monstera</p>
              </li>
              <li className="text-sm">
                <span className="text-blue-600">Yesterday, 9:15 AM</span>
                <p className="text-emerald-800">Moved Snake Plant to Tower B</p>
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search plants by name or location..."
              className="pl-10 border-emerald-200 focus:border-emerald-500 bg-white/80 backdrop-blur-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Plant
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-emerald-800 mb-4">Plants Needing Attention</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plants.filter((p) => p.health !== "good").length > 0 ? (
              plants
                .filter((p) => p.health !== "good")
                .map((plant) => (
                  <Link href={`/plant/${plant.id}`} key={plant.id}>
                    <motion.div
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-emerald-100 flex items-center p-3 gap-3"
                    >
                      <div
                        className="w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
                        style={{ backgroundImage: `url(${plant.image})` }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-emerald-800 truncate">{plant.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "px-1 py-0 text-xs",
                              plant.health === "average" && "bg-amber-100 text-amber-700 hover:bg-amber-200",
                              plant.health === "poor" && "bg-red-100 text-red-700 hover:bg-red-200",
                            )}
                          >
                            {plant.health === "average" && "Needs Attention"}
                            {plant.health === "poor" && "Critical"}
                          </Badge>
                          <span className="text-xs text-emerald-600 truncate">{plant.location}</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))
            ) : (
              <div className="col-span-full text-center py-8 bg-emerald-50 rounded-xl border border-dashed border-emerald-200">
                <div className="inline-block p-3 bg-emerald-100 rounded-full mb-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-emerald-800 font-medium">All plants are healthy!</p>
                <p className="text-sm text-emerald-600 mt-1">Great job keeping your plants in good condition</p>
              </div>
            )}
          </div>
        </div>

        {filteredPlants.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-emerald-50 inline-block p-4 rounded-full mb-4">
              <Leaf className="h-12 w-12 text-emerald-300" />
            </div>
            <h3 className="text-xl font-medium text-emerald-800 mb-2">No plants found</h3>
            <p className="text-emerald-600 mb-6">Add your first plant to start monitoring</p>
            <Button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add New Plant
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlants.map((plant) => (
              <Link href={`/plant/${plant.id}`} key={plant.id}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-emerald-100"
                >
                  <div className="h-48 overflow-hidden relative">
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${plant.image})` }}
                    ></div>
                    <div
                      className={cn(
                        "absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-white",
                        plant.health === "good" && "bg-emerald-500",
                        plant.health === "average" && "bg-amber-500",
                        plant.health === "poor" && "bg-red-500",
                      )}
                    >
                      {plant.health === "good" && "Healthy"}
                      {plant.health === "average" && "Needs Attention"}
                      {plant.health === "poor" && "Critical"}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-lg text-emerald-800 mb-1">{plant.name}</h3>
                    <p className="text-emerald-600 text-sm mb-2">{plant.type}</p>
                    <div className="flex items-center text-emerald-500 text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="truncate">{plant.location}</span>
                    </div>
                    {plant.lastWatered && (
                      <div className="mt-3 text-xs text-emerald-600/70">Last watered: {plant.lastWatered}</div>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Plant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-2xl font-medium text-emerald-800 mb-4">Add New Plant</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-emerald-700 mb-1">
                  Plant Name
                </label>
                <Input
                  id="name"
                  value={newPlant.name}
                  onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                  placeholder="e.g., Aloe Vera"
                  className="border-emerald-200"
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-emerald-700 mb-1">
                  Location
                </label>
                <Input
                  id="location"
                  value={newPlant.location}
                  onChange={(e) => setNewPlant({ ...newPlant, location: e.target.value })}
                  placeholder="e.g., Tower A, Floor 3"
                  className="border-emerald-200"
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-emerald-700 mb-1">
                  Plant Type
                </label>
                <select
                  id="type"
                  value={newPlant.type}
                  onChange={(e) => setNewPlant({ ...newPlant, type: e.target.value })}
                  className="w-full rounded-md border border-emerald-200 py-2 px-3 text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Succulent">Succulent</option>
                  <option value="Flowering">Flowering</option>
                  <option value="Tropical">Tropical</option>
                  <option value="Herb">Herb</option>
                  <option value="Vegetable">Vegetable</option>
                  <option value="Fruit">Fruit</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="border-emerald-200 text-emerald-800"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddPlant} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Add Plant
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
