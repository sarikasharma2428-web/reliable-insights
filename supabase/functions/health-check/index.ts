import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Allowed origins for CORS - restrict to known domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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

    const healthResults = []

    for (const service of services || []) {
      // Simulate health check with realistic patterns
      const healthScore = Math.random()
      let isHealthy = healthScore > 0.1 // 90% healthy by default
      
      // If service was already degraded/critical, higher chance of issues
      if (service.status === 'degraded') {
        isHealthy = healthScore > 0.3
      } else if (service.status === 'critical') {
        isHealthy = healthScore > 0.5
      }

      const responseTime = isHealthy 
        ? Math.round(20 + Math.random() * 80) 
        : Math.round(500 + Math.random() * 2000)

      const checkResult = {
        service_id: service.id,
        service_name: service.name,
        healthy: isHealthy,
        response_time: responseTime,
        checked_at: new Date().toISOString()
      }

      healthResults.push(checkResult)

      // Log the health check
      await supabase.from('logs').insert({
        service_id: service.id,
        level: isHealthy ? 'info' : 'error',
        message: `Health check ${isHealthy ? 'passed' : 'failed'} for ${service.name} (${responseTime}ms)`,
        trace_id: `health-${Date.now().toString(36)}`,
        metadata: {
          check_type: 'health_check',
          response_time: responseTime,
          healthy: isHealthy
        }
      })

      // If unhealthy and not already tracked, create alert
      if (!isHealthy && service.status !== 'critical') {
        const { data: existingAlerts } = await supabase
          .from('alerts')
          .select('*')
          .eq('service_id', service.id)
          .eq('metric_name', 'health_check')
          .is('acknowledged_at', null)
          .limit(1)

        if (!existingAlerts || existingAlerts.length === 0) {
          await supabase.from('alerts').insert({
            name: `Health Check Failed: ${service.name}`,
            message: `Service ${service.name} failed health check with response time ${responseTime}ms`,
            severity: 'critical',
            service_id: service.id,
            metric_name: 'health_check',
            threshold: 200,
            current_value: responseTime,
            fired_at: new Date().toISOString()
          })
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results: healthResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Error in health-check:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
