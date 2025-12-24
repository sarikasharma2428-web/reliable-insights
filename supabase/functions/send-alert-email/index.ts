import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  alertName: string;
  severity: string;
  serviceName: string;
  message: string;
  metricName: string;
  threshold: number;
  currentValue: number;
  firedAt: string;
}

const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical': return '#dc2626';
    case 'warning': return '#f59e0b';
    case 'info': return '#3b82f6';
    default: return '#6b7280';
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-alert-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      alertName, 
      severity, 
      serviceName, 
      message, 
      metricName, 
      threshold, 
      currentValue, 
      firedAt 
    }: AlertEmailRequest = await req.json();

    console.log(`Sending alert email for: ${alertName} (${severity})`);

    const severityColor = getSeverityColor(severity);
    const formattedTime = new Date(firedAt).toLocaleString();

    const emailResponse = await resend.emails.send({
      from: "SRE Platform <onboarding@resend.dev>",
      to: ["sarikasharma9711@gmail.com"],
      subject: `[${severity.toUpperCase()}] Alert: ${alertName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; overflow: hidden;">
            
            <div style="background-color: ${severityColor}; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px;">
                🚨 ${severity.toUpperCase()} ALERT
              </h1>
            </div>
            
            <div style="padding: 24px;">
              <h2 style="margin: 0 0 16px 0; color: #f8fafc; font-size: 20px;">
                ${alertName}
              </h2>
              
              <p style="color: #94a3b8; margin: 0 0 24px 0; font-size: 16px;">
                ${message}
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px; background-color: #334155; border-radius: 4px 4px 0 0;">
                    <strong style="color: #94a3b8;">Service</strong>
                  </td>
                  <td style="padding: 12px; background-color: #334155; border-radius: 4px 4px 0 0; text-align: right;">
                    <span style="color: #f8fafc;">${serviceName || 'N/A'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #293548;">
                    <strong style="color: #94a3b8;">Metric</strong>
                  </td>
                  <td style="padding: 12px; background-color: #293548; text-align: right;">
                    <span style="color: #f8fafc;">${metricName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #334155;">
                    <strong style="color: #94a3b8;">Threshold</strong>
                  </td>
                  <td style="padding: 12px; background-color: #334155; text-align: right;">
                    <span style="color: #f8fafc;">${threshold}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #293548;">
                    <strong style="color: #94a3b8;">Current Value</strong>
                  </td>
                  <td style="padding: 12px; background-color: #293548; text-align: right;">
                    <span style="color: ${severityColor}; font-weight: bold;">${currentValue}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; background-color: #334155; border-radius: 0 0 4px 4px;">
                    <strong style="color: #94a3b8;">Fired At</strong>
                  </td>
                  <td style="padding: 12px; background-color: #334155; border-radius: 0 0 4px 4px; text-align: right;">
                    <span style="color: #f8fafc;">${formattedTime}</span>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center;">
                <a href="#" style="display: inline-block; background-color: ${severityColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                  View in Dashboard
                </a>
              </div>
            </div>
            
            <div style="background-color: #0f172a; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                SRE Observability Platform • Automated Alert Notification
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending alert email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
