import { NextResponse } from 'next/server';
import { getSalesData } from '../../../db'; // Assuming db.js is at root

export async function GET() {
    try {
        const data = await getSalesData();
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
