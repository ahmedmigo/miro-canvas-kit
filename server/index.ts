import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the build directory in production
const buildPath = path.join(__dirname, '../build');
app.use(express.static(buildPath));

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface ExecutePromptRequest {
  prompt: string;
  context: {
    inputs: Array<{
      nodeId: string;
      nodeType: string;
      content: any;
      promptTitle?: string;
    }>;
    previousResults: Array<{
      nodeId: string;
      result: any;
    }>;
  };
  nodeType: string;
}

app.post('/api/execute-prompt', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' });
    }

    const { prompt, context, nodeType } = req.body as ExecutePromptRequest;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    let systemMessage = `You are a helpful assistant that generates structured content. `;
    systemMessage += `You must respond with valid JSON matching the exact schema for the content type.`;
    
    // Add specific format instructions based on node type
    if (nodeType === 'document') {
      systemMessage += `

DOCUMENT SCHEMA:
{
  "content": "string - Full document as markdown. Use # for title, ## for sections, ### for subsections, and regular paragraphs separated by blank lines."
}

Example:
{"content": "# Project Overview\\n\\nThis document describes...\\n\\n## Goals\\n\\nOur main goals are...\\n\\n## Timeline\\n\\nThe project will be completed by..."}`;
    } else if (nodeType === 'table') {
      systemMessage += `

TABLE SCHEMA:
{
  "columns": [
    {"id": "string", "label": "string", "type": "text|number|select|date", "width": 150}
  ],
  "rows": [
    {"id": "row1", "columnId1": "value1", "columnId2": "value2", ...}
  ]
}

Example for a task list:
{"columns": [{"id": "task", "label": "Task", "type": "text", "width": 200, "isPrimary": true}, {"id": "status", "label": "Status", "type": "select", "width": 100}, {"id": "due", "label": "Due Date", "type": "date", "width": 120}], "rows": [{"id": "1", "task": "Research", "status": "Done", "due": "2024-01-15"}, {"id": "2", "task": "Design", "status": "In Progress", "due": "2024-01-20"}]}`;
    } else if (nodeType === 'slides') {
      systemMessage += `

SLIDES SCHEMA:
{
  "slides": [
    {"id": "string", "title": "string", "content": "string - markdown content for the slide body", "notes": "optional speaker notes"}
  ]
}

Example:
{"slides": [{"id": "1", "title": "Introduction", "content": "Welcome to our presentation\\n\\n- Point one\\n- Point two", "notes": "Greet the audience"}, {"id": "2", "title": "Key Findings", "content": "## Results\\n\\nOur research shows..."}]}`;
    } else if (nodeType === 'diagram') {
      systemMessage += `

DIAGRAM SCHEMA:
{
  "title": "string - diagram title",
  "diagramType": "flowchart|mindmap|orgchart|sequence|process",
  "nodes": [
    {"id": "string", "label": "string", "type": "start|end|process|decision|default"}
  ],
  "edges": [
    {"from": "nodeId", "to": "nodeId", "label": "optional edge label"}
  ]
}

Example flowchart:
{"title": "User Login Flow", "diagramType": "flowchart", "nodes": [{"id": "1", "label": "Start", "type": "start"}, {"id": "2", "label": "Enter Credentials", "type": "process"}, {"id": "3", "label": "Valid?", "type": "decision"}, {"id": "4", "label": "Dashboard", "type": "process"}, {"id": "5", "label": "Error", "type": "process"}], "edges": [{"from": "1", "to": "2"}, {"from": "2", "to": "3"}, {"from": "3", "to": "4", "label": "Yes"}, {"from": "3", "to": "5", "label": "No"}]}`;
    } else if (nodeType === 'prototype') {
      systemMessage += `

PROTOTYPE SCHEMA:
{
  "title": "string - app/prototype name",
  "screens": [
    {"id": "string", "name": "string", "description": "string", "elements": [{"type": "header|button|input|text|image|list", "label": "string", "action": "optional - navigateTo:screenId"}]}
  ]
}

Example:
{"title": "Shopping App", "screens": [{"id": "home", "name": "Home Screen", "description": "Main landing page", "elements": [{"type": "header", "label": "Welcome to Shop"}, {"type": "button", "label": "Browse Products", "action": "navigateTo:products"}, {"type": "button", "label": "My Cart", "action": "navigateTo:cart"}]}, {"id": "products", "name": "Products", "description": "Product listing", "elements": [{"type": "header", "label": "Products"}, {"type": "list", "label": "Product Grid"}]}]}`;
    } else if (nodeType === 'image') {
      try {
        let imagePrompt = prompt;
        
        if (context.inputs?.length > 0) {
          imagePrompt = `Based on the following context, create an image: ${prompt}\n\nContext:\n`;
          context.inputs.forEach((input) => {
            imagePrompt += `${input.nodeType}: ${JSON.stringify(input.content)}\n`;
          });
        }
        
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        });
        
        const imageUrl = imageResponse.data[0]?.url;
        if (!imageUrl) {
          return res.status(500).json({ error: 'Failed to generate image' });
        }
        
        return res.json({ 
          success: true, 
          result: { 
            imageUrl,
            revisedPrompt: imageResponse.data[0]?.revised_prompt 
          } 
        });
      } catch (error: any) {
        console.error('Error generating image:', error);
        const safeMessage = error.code === 'content_policy_violation'
          ? 'Content policy violation. Please try a different prompt.'
          : 'Failed to generate image. Please try again.';
        return res.status(500).json({ error: safeMessage });
      }
    }

    let userMessage = '';
    
    if (context.inputs?.length > 0) {
      userMessage += 'Context from connected inputs:\n';
      context.inputs.forEach((input, i) => {
        userMessage += `\n--- Input ${i + 1} (${input.nodeType}${input.promptTitle ? `: ${input.promptTitle}` : ''}) ---\n`;
        userMessage += JSON.stringify(input.content, null, 2);
      });
      userMessage += '\n\n';
    }

    if (context.previousResults?.length > 0) {
      userMessage += 'Results from previous steps:\n';
      context.previousResults.forEach((prev, i) => {
        userMessage += `\n--- Previous Result ${i + 1} ---\n`;
        userMessage += JSON.stringify(prev.result, null, 2);
      });
      userMessage += '\n\n';
    }

    userMessage += `Task: ${prompt}\n\n`;
    userMessage += `Generate content for a ${nodeType}. Respond with JSON only.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    const result = JSON.parse(content);
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Error executing prompt:', error);
    // Sanitize error messages to avoid leaking internal details
    const safeMessage = error.code === 'insufficient_quota' 
      ? 'API quota exceeded. Please check your OpenAI account.'
      : error.status === 401
        ? 'Invalid API key. Please check your OpenAI configuration.'
        : 'Failed to execute prompt. Please try again.';
    res.status(500).json({ error: safeMessage });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!process.env.OPENAI_API_KEY });
});

// Catch-all route for SPA - serve index.html for any non-API routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// In development, use port 3001 to not conflict with Vite on 5000
// In production, use PORT env var (defaults to 5000)
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || (isProduction ? 5000 : 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
