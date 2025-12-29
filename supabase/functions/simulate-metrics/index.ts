import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for all origins (dev only function)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Test Data Generation Function
 * 
 * This function generates sample data for testing purposes.
 * It creates services with realistic metrics, logs, alerts, and incidents.
 * 
 * IMPORTANT: This function inserts REAL data into the database.
 * It should only be called from the Test Panel in development mode.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')

    if (servicesError) throw servicesError

    // If no services exist, create default test services
    if (!services || services.length === 0) {
      const defaultServices = [
        { name: 'api-gateway', description: 'Main API Gateway', status: 'healthy' },
        { name: 'auth-service', description: 'Authentication Service', status: 'healthy' },
        { name: 'payment-service', description: 'Payment Processing', status: 'healthy' },
        { name: 'inventory-service', description: 'Inventory Management', status: 'healthy' },
        { name: 'notification-service', description: 'Notification System', status: 'healthy' },
        { name: 'user-service', description: 'User Management', status: 'healthy' },
      ]

      const { data: newServices, error: insertError } = await supabase
        .from('services')
        .insert(defaultServices)
        .select()

      if (insertError) throw insertError
      
      return new Response(JSON.stringify({ 
        message: 'Created default services',
        servicesCreated: newServices.length,
        servicesUpdated: 0,
        metricsRecorded: 0,
        alertsCreated: 0,
        incidentsCreated: 0,
        logsGenerated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const metrics: unknown[] = []
    const alerts: unknown[] = []
    const incidents: unknown[] = []
    const updatedServices: unknown[] = []

    for (const service of services) {
      // Generate realistic metrics with some variability
      const baseLatency = 50 + Math.random() * 100
      const latencySpike = Math.random() > 0.95 ? Math.random() * 500 : 0
      const latencyP50 = Math.round(baseLatency + latencySpike)
      const latencyP99 = Math.round(latencyP50 * (1.5 + Math.random()))

      const baseErrorRate = 0.1 + Math.random() * 0.5
      const errorSpike = Math.random() > 0.92 ? Math.random() * 10 : 0
      const errorRate = Math.min(baseErrorRate + errorSpike, 100)

      const baseCpu = 20 + Math.random() * 40
      const cpuSpike = Math.random() > 0.9 ? Math.random() * 40 : 0
      const cpuUsage = Math.min(baseCpu + cpuSpike, 100)

      const baseMemory = 30 + Math.random() * 30
      const memorySpike = Math.random() > 0.88 ? Math.random() * 30 : 0
      const memoryUsage = Math.min(baseMemory + memorySpike, 100)

      const requestsPerSecond = Math.round(100 + Math.random() * 900)
      const uptime = Math.max(99 + Math.random() * 1, 99 - errorRate)

      // Determine service status based on metrics
      let status = 'healthy'
      if (errorRate > 5 || cpuUsage > 90 || memoryUsage > 90 || latencyP99 > 500) {
        status = 'critical'
      } else if (errorRate > 2 || cpuUsage > 75 || memoryUsage > 75 || latencyP99 > 300) {
        status = 'degraded'
      }

      // Update service with new metrics
      updatedServices.push({
        id: service.id,
        status,
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        latency_p50: latencyP50,
        latency_p99: latencyP99,
        error_rate: errorRate,
        requests_per_second: requestsPerSecond,
        uptime: uptime,
        last_checked_at: new Date().toISOString()
      })

      // Record metrics
      const metricTypes = [
        { name: 'cpu_usage', value: cpuUsage, unit: 'percent' },
        { name: 'memory_usage', value: memoryUsage, unit: 'percent' },
        { name: 'latency_p50', value: latencyP50, unit: 'ms' },
        { name: 'latency_p99', value: latencyP99, unit: 'ms' },
        { name: 'error_rate', value: errorRate, unit: 'percent' },
        { name: 'requests_per_second', value: requestsPerSecond, unit: 'rps' },
      ]

      for (const metric of metricTypes) {
        metrics.push({
          service_id: service.id,
          metric_name: metric.name,
          value: metric.value,
          unit: metric.unit,
          recorded_at: new Date().toISOString()
        })
      }

      // Auto-detect issues and create alerts/incidents
      if (status === 'critical' || status === 'degraded') {
        // Check for existing open incidents for this service
        const { data: existingIncidents } = await supabase
          .from('incidents')
          .select('*')
          .eq('service_id', service.id)
          .in('status', ['open', 'acknowledged'])
          .limit(1)

        if (!existingIncidents || existingIncidents.length === 0) {
          // Create new incident
          const incidentNumber = `INC-${Date.now().toString(36).toUpperCase()}`
          let title = ''
          let description = ''
          let triggeredBy = ''
          let severity = 'low'

          if (errorRate > 5) {
            title = `High Error Rate on ${service.name}`
            description = `Error rate has reached ${errorRate.toFixed(2)}% which exceeds the 5% threshold.`
            triggeredBy = 'error_rate_threshold'
            severity = 'critical'
          } else if (cpuUsage > 90) {
            title = `CPU Critical on ${service.name}`
            description = `CPU usage has reached ${cpuUsage.toFixed(1)}% which exceeds the 90% threshold.`
            triggeredBy = 'cpu_threshold'
            severity = 'critical'
          } else if (memoryUsage > 90) {
            title = `Memory Critical on ${service.name}`
            description = `Memory usage has reached ${memoryUsage.toFixed(1)}% which exceeds the 90% threshold.`
            triggeredBy = 'memory_threshold'
            severity = 'critical'
          } else if (latencyP99 > 500) {
            title = `High Latency on ${service.name}`
            description = `P99 latency has reached ${latencyP99}ms which exceeds the 500ms threshold.`
            triggeredBy = 'latency_threshold'
            severity = 'high'
          } else if (errorRate > 2) {
            title = `Elevated Error Rate on ${service.name}`
            description = `Error rate has reached ${errorRate.toFixed(2)}% which exceeds the 2% warning threshold.`
            triggeredBy = 'error_rate_warning'
            severity = 'medium'
          } else {
            title = `Performance Degradation on ${service.name}`
            description = `Service is experiencing degraded performance. CPU: ${cpuUsage.toFixed(1)}%, Memory: ${memoryUsage.toFixed(1)}%, Latency P99: ${latencyP99}ms`
            triggeredBy = 'auto_detection'
            severity = 'medium'
          }

          incidents.push({
            incident_number: incidentNumber,
            title,
            description,
            severity,
            status: 'open',
            service_id: service.id,
            triggered_by: triggeredBy,
            started_at: new Date().toISOString()
          })

          // Create corresponding alert
          alerts.push({
            name: title,
            message: description,
            severity: severity === 'critical' ? 'critical' : severity === 'high' ? 'warning' : 'info',
            service_id: service.id,
            metric_name: triggeredBy,
            threshold: triggeredBy.includes('error') ? 5 : triggeredBy.includes('cpu') ? 90 : triggeredBy.includes('memory') ? 90 : 500,
            current_value: triggeredBy.includes('error') ? errorRate : triggeredBy.includes('cpu') ? cpuUsage : triggeredBy.includes('memory') ? memoryUsage : latencyP99,
            fired_at: new Date().toISOString()
          })
        }
      } else if (status === 'healthy') {
        // Auto-resolve incidents for healthy services
        await supabase
          .from('incidents')
          .update({ 
            status: 'resolved', 
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('service_id', service.id)
          .in('status', ['open', 'acknowledged'])
      }
    }

    // Batch update services
    for (const service of updatedServices) {
      await supabase
        .from('services')
        .update(service)
        .eq('id', (service as { id: string }).id)
    }

    // Batch insert metrics
    if (metrics.length > 0) {
      await supabase.from('metrics').insert(metrics)
    }

    // Batch insert alerts
    if (alerts.length > 0) {
      await supabase.from('alerts').insert(alerts)
    }

    // Batch insert incidents
    if (incidents.length > 0) {
      await supabase.from('incidents').insert(incidents)
    }

    // Generate logs
    const logLevels = ['info', 'info', 'info', 'warn', 'error', 'debug']
    const logMessages = [
      'Request processed successfully',
      'Database query executed',
      'Cache hit for user session',
      'Slow query detected',
      'Connection timeout',
      'Health check passed',
      'Rate limit applied',
      'Authentication successful',
      'API rate limit warning',
      'Memory threshold exceeded',
    ]

    const logs: unknown[] = []
    for (const service of services) {
      const numLogs = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < numLogs; i++) {
        const level = logLevels[Math.floor(Math.random() * logLevels.length)]
        const message = logMessages[Math.floor(Math.random() * logMessages.length)]
        logs.push({
          service_id: service.id,
          level,
          message: `[${service.name}] ${message}`,
          trace_id: `trace-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`,
          metadata: {
            host: `${service.name}-${Math.floor(Math.random() * 3) + 1}`,
            region: ['us-east-1', 'eu-west-1', 'ap-south-1'][Math.floor(Math.random() * 3)],
            duration_ms: Math.floor(Math.random() * 500)
          }
        })
      }
    }

    if (logs.length > 0) {
      await supabase.from('logs').insert(logs)
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      servicesUpdated: updatedServices.length,
      metricsRecorded: metrics.length,
      alertsCreated: alerts.length,
      incidentsCreated: incidents.length,
      logsGenerated: logs.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Error in data generation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
