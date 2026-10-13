import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContainerUpdate {
  container_number: string;
  status: string;
  departure_date?: string;
  estimated_arrival?: string;
  notes?: string;
}

interface NotifyRequest {
  updates: ContainerUpdate[];
  notify_customers: boolean;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Amoliga Logistics <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${errorText}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No valid token provided' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's auth token to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT via server-side validation
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.log("Invalid token:", userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid session' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    // Authorization check - require admin or manager role
    const { data: roles, error: rolesError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'manager']);

    if (rolesError) {
      console.log("Error checking roles:", rolesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!roles || roles.length === 0) {
      console.log(`User ${userId} does not have admin or manager role`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Insufficient permissions. Admin or manager role required.' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`User ${userId} authorized with roles:`, roles.map(r => r.role));

    const { updates, notify_customers }: NotifyRequest = await req.json();
    
    console.log(`Processing ${updates.length} container updates, notify: ${notify_customers}`);

    if (!notify_customers || updates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No notifications sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role key for database operations that need elevated privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all container IDs that were updated
    const containerNumbers = updates.map(u => u.container_number);
    
    // Find shipments linked to these containers
    const { data: containers } = await supabase
      .from("containers")
      .select("id, container_number")
      .in("container_number", containerNumbers);

    if (!containers || containers.length === 0) {
      console.log("No containers found for notification");
      return new Response(
        JSON.stringify({ success: true, message: "No containers found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const containerIds = containers.map(c => c.id);
    
    // Get shipments and their users
    const { data: shipments } = await supabase
      .from("shipments")
      .select("user_code, container_id, product, tracking_number")
      .in("container_id", containerIds);

    if (!shipments || shipments.length === 0) {
      console.log("No shipments found for notification");
      return new Response(
        JSON.stringify({ success: true, message: "No shipments to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user emails from profiles
    const userCodes = [...new Set(shipments.map(s => s.user_code))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("unique_code, email, full_name")
      .in("unique_code", userCodes);

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found for notification");
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create container lookup
    const containerLookup = new Map(containers.map(c => [c.id, c.container_number]));
    const updateLookup = new Map(updates.map(u => [u.container_number, u]));

    // Send emails to each affected user
    let emailsSent = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      if (!profile.email) continue;

      // Find shipments for this user
      const userShipments = shipments.filter(s => s.user_code === profile.unique_code);
      
      // Build update details
      const shipmentUpdates = userShipments.map(s => {
        const containerNum = containerLookup.get(s.container_id!);
        const update = containerNum ? updateLookup.get(containerNum) : null;
        return {
          product: s.product,
          tracking: s.tracking_number,
          container: containerNum,
          status: update?.status || "Updated",
          eta: update?.estimated_arrival,
        };
      }).filter(s => s.container);

      if (shipmentUpdates.length === 0) continue;

      const statusSummary = shipmentUpdates
        .map(s => `• ${s.product} (${s.tracking}) - Container: ${s.container} - Status: ${s.status}${s.eta ? ` - ETA: ${s.eta}` : ''}`)
        .join('\n');

      try {
        await sendEmail(
          profile.email,
          "📦 Container Update - Your Shipment Status Changed",
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">Shipment Update</h1>
              <p>Hello ${profile.full_name || 'Valued Customer'},</p>
              <p>Your shipment container information has been updated:</p>
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <pre style="font-family: monospace; white-space: pre-wrap;">${statusSummary}</pre>
              </div>
              <p>Log in to your account to view full details and track your shipments.</p>
              <p>Thank you for choosing Amoliga Logistics!</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
            </div>
          `
        );
        emailsSent++;
        console.log(`Email sent to ${profile.email}`);
      } catch (emailError: any) {
        console.error(`Failed to send email to ${profile.email}:`, emailError.message);
        errors.push(`${profile.email}: ${emailError.message}`);
      }
    }

    // Also create in-app notifications
    for (const profile of profiles) {
      const userShipments = shipments.filter(s => s.user_code === profile.unique_code);
      if (userShipments.length === 0) continue;

      const containerNum = containerLookup.get(userShipments[0].container_id!);
      const update = containerNum ? updateLookup.get(containerNum) : null;

      await supabase.from("notifications").insert({
        user_code: profile.unique_code,
        title: "Container Updated",
        message: `Your container ${containerNum} status has been updated to: ${update?.status || 'Updated'}`,
        type: "shipment",
      });
    }

    console.log(`Notification complete: ${emailsSent} emails sent, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-container-update:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
