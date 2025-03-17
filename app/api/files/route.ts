import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { saveFileMetadata, getUserFiles, getTaskFiles } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// GET /api/files - Get all files for the current user
// Can filter by task_id using ?task_id=xxx
export async function GET(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('task_id');
    
    let result;
    
    if (taskId) {
      // Get files for a specific task
      result = await getTaskFiles(taskId);
    } else {
      // Get all files for the user
      result = await getUserFiles(userId);
    }
    
    if (!result.data) {
      throw new Error(result.error as any);
    }
    
    return NextResponse.json({ files: result.data });
  } catch (error) {
    console.error('Error getting files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve files' },
      { status: 500 }
    );
  }
}

// POST /api/files - Save file metadata after upload to storage
export async function POST(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { file_name, file_path, file_type, file_size, task_id, workflow_id } = body;
    
    if (!file_name || !file_path || !file_type || !file_size) {
      return NextResponse.json(
        { error: 'File name, path, type, and size are required fields' },
        { status: 400 }
      );
    }
    
    // Save the file metadata
    const result = await saveFileMetadata({
      user_id: userId,
      file_name,
      file_path,
      file_type,
      file_size,
      task_id: task_id || undefined,
      workflow_id: workflow_id || undefined
    });
    
    if (!result.data) {
      throw new Error(result.error as any);
    }
    
    return NextResponse.json({
      success: true,
      file: result.data
    });
  } catch (error) {
    console.error('Error saving file metadata:', error);
    return NextResponse.json(
      { error: 'Failed to save file metadata' },
      { status: 500 }
    );
  }
} 