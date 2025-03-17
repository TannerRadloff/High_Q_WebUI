import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    // This endpoint handles file uploads that are sent via API route
    // Note: For larger files, it's often better to upload directly to Supabase Storage
    // from the client, but this provides an alternative approach
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Get file metadata
    const filename = file.name;
    const contentType = file.type;
    const fileSize = file.size;
    
    // Optional: validate file type and size
    const allowedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/json'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }
    
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds the limit (10MB)' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer for upload
    const buffer = await file.arrayBuffer();
    
    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from('user_uploads')
      .upload(`${userId}/${Date.now()}_${filename}`, buffer, {
        contentType,
        cacheControl: '3600',
      });
    
    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError },
        { status: 500 }
      );
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('user_uploads')
      .getPublicUrl(data.path);
    
    // Return success response with file details
    return NextResponse.json({
      success: true,
      file: {
        name: filename,
        size: fileSize,
        type: contentType,
        path: data.path,
        url: publicUrl
      }
    });
    
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json(
      { error: 'Failed to process file upload', details: error },
      { status: 500 }
    );
  }
} 