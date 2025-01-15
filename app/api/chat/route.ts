export const maxDuration = 30;

import { z } from 'zod';

const requestSchema = z.object({
  input_value: z.string().min(1, "Message cannot be empty").default(""),
  session_id: z.string().default("A0005"),
  output_type: z.string().default("chat"),
  input_type: z.string().default("chat"),
  tweaks: z.record(z.any()).default({
    "AmazonBedrockModel-2gBD9": {
      aws_access_key_id: "aws_access_key_id",
      aws_secret_access_key: "aws_secret_access_key", 
      aws_session_token: "aws_session_token",
      credentials_profile_name: "",
      endpoint_url: "",
      input_value: "",
      model_id: "us.meta.llama3-2-3b-instruct-v1:0",
      model_kwargs: {},
      region_name: "us-east-2",
      stream: false,
      system_message: ""
    }
  })
});

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    
    // Validate request body and provide detailed error messages
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      
      return Response.json(
        { error: 'Validation failed', details: errorMessages },
        { status: 400 }
      );
    }
    
    const { input_value, session_id, output_type, input_type, tweaks } = validation.data;
    
    const apiResponse = await fetch("https://api.langflow.astra.datastax.com/lf/c299f9a6-d655-4b0d-896c-9654a3f02332/api/v1/run/aurora-ai-alpha?stream=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CUSTOM_TOKEN}`
      },
      body: JSON.stringify({
        input_value,
        session_id: session_id || "A0005",
        output_type: output_type || "chat",
        input_type: input_type || "chat",
        tweaks: tweaks || {
          "AmazonBedrockModel-2gBD9": {
            aws_access_key_id: "aws_access_key_id",
            aws_secret_access_key: "aws_secret_access_key",
            aws_session_token: "aws_session_token",
            credentials_profile_name: "",
            endpoint_url: "",
            input_value: "",
            model_id: "us.meta.llama3-2-3b-instruct-v1:0",
            model_kwargs: {},
            region_name: "us-east-2",
            stream: false,
            system_message: ""
          }
        }
      }),
      signal: request.signal
    });

    if (!apiResponse.ok) {
      throw new Error(`API request failed with status ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    console.log('API Response:', data);
    
    // Handle different response structures
    let responseText = '';
    if (data.outputs && data.outputs.length > 0) {
      const output = data.outputs[0];
      responseText = output?.outputs?.[0]?.results?.message?.data?.text ||
                    output?.outputs?.[0]?.text ||
                    output?.text ||
                    '';
    } else {
      responseText = data.text || data.message || '';
    }
    
    // Handle case where response is an array
    const finalText = Array.isArray(responseText) ? 
                      responseText.join('\n') : 
                      responseText || 'No response text found';

    return Response.json({
      text: finalText
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
};
