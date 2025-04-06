#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as falClient from "@fal-ai/serverless-client";
import { z } from "zod";

// Load environment variables
config();

// Set FAL API key
if (process.env.FAL_KEY) {
  falClient.config({
    credentials: process.env.FAL_KEY
  });
} else {
  console.error("Warning: FAL_KEY environment variable is not set. API calls will fail.");
}

// Define model URLs
const MODELS = {
  luma: "fal-ai/luma-dream-machine/ray-2-flash/image-to-video",
  kling: "fal-ai/kling-video/v1.6/pro/image-to-video"
};

// Create server
const server = new Server(
  { name: "video-generator", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Import MCP schemas
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate-video",
        description: "Generate a video from text prompt and/or images using AI models (Luma or Kling)",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Text description of the desired video content"
            },
            image_url: {
              type: "string",
              description: "Initial image to start the video from (URL or base64 data URI)"
            },
            end_image_url: {
              type: "string",
              description: "Final image to end the video with (URL or base64 data URI)"
            },
            aspect_ratio: {
              type: "string",
              enum: ["16:9", "9:16", "4:3", "3:4", "21:9", "9:21"],
              default: "16:9",
              description: "Aspect ratio of the video"
            },
            resolution: {
              type: "string",
              enum: ["540p", "720p", "1080p"],
              default: "540p",
              description: "Resolution of the video (higher resolutions use more credits)"
            },
            duration: {
              type: "string",
              enum: ["5s", "9s"],
              default: "5s",
              description: "Duration of the video (9s costs 2x more)"
            },
            loop: {
              type: "boolean",
              default: false,
              description: "Whether the video should loop (blend end with beginning)"
            },
            model: {
              type: "string",
              enum: ["luma", "kling"],
              default: "luma",
              description: "AI model to use (luma=Ray2, kling=Kling)"
            }
          },
          required: ["prompt"]
        }
      },
      {
        name: "check-video-status",
        description: "Check the status of a video generation request",
        inputSchema: {
          type: "object",
          properties: {
            request_id: {
              type: "string",
              description: "The request ID to check"
            },
            model: {
              type: "string",
              enum: ["luma", "kling"],
              default: "luma",
              description: "AI model used for the request (luma=Ray2, kling=Kling)"
            }
          },
          required: ["request_id"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  if (name === "generate-video") {
    try {
      // Determine which model to use
      const modelName = args.model || "luma";
      const modelUrl = MODELS[modelName as keyof typeof MODELS];
      
      if (!modelUrl) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Invalid model: ${modelName}. Supported models are: luma, kling`
            }
          ]
        };
      }

      console.error(`Generating video with ${modelName} model and prompt: "${args.prompt}"`);
      
      // Clone args and remove model parameter that isn't used by the API
      const apiArgs = {...args};
      delete apiArgs.model;
      
      // Call the FAL API
      const result: any = await falClient.subscribe(modelUrl, {
        input: apiArgs,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS" && update.logs) {
            update.logs.forEach((log: any) => {
              if (typeof log === 'string') {
                console.error(`Progress: ${log}`);
              } else if (log.message) {
                console.error(`Progress: ${log.message}`);
              }
            });
          }
        },
      });
      
      console.error(`Video generation completed successfully using ${modelName} model`);
      
      // Extract the video URL from the response
      let videoUrl = '';
      let requestId = 'Unknown';
      
      if (result) {
        if (result.video && result.video.url) {
          videoUrl = result.video.url;
        } else if (result.data && result.data.video && result.data.video.url) {
          videoUrl = result.data.video.url;
        }
        
        if (result.requestId) {
          requestId = result.requestId;
        }
      }
      
      // Return result
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              model: modelName,
              video_url: videoUrl || 'Video URL not found in response',
              message: `Video generated successfully using ${modelName} model`,
              request_id: requestId
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      console.error("Error generating video:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error generating video: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  } else if (name === "check-video-status") {
    try {
      // Determine which model to use
      const modelName = args.model || "luma";
      const modelUrl = MODELS[modelName as keyof typeof MODELS];
      
      if (!modelUrl) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Invalid model: ${modelName}. Supported models are: luma, kling`
            }
          ]
        };
      }

      const status: any = await falClient.queue.status(modelUrl, {
        requestId: args.request_id,
        logs: true
      });
      
      // Safely extract properties
      const statusLogs = Array.isArray(status.logs) ? status.logs : [];
      const position = status.position || status.queue_position || 0;
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              model: modelName,
              status: status.status,
              logs: statusLogs,
              position: position
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error checking video status: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  } else {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`
        }
      ]
    };
  }
});

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Video Generator MCP Server running on stdio");
    console.error("Supported models: Luma Ray2, Kling v1.6 Pro");
  } catch (error: any) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();