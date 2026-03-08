import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase only if keys are provided and not placeholders
const isSupabaseConfigured =
    supabaseUrl &&
    supabaseUrl !== 'https://your-project-url.supabase.co' &&
    supabaseKey &&
    supabaseKey !== 'your-anon-key';

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Data Layer Abstraction
 * Currently supports: CSV, Supabase
 * Toggle via DATA_SOURCE in .env
 */
export async function getSalesData() {
    const useSupabase = process.env.DATA_SOURCE === 'supabase' && supabase;

    if (useSupabase) {
        console.log('📡 Fetching data from Supabase...');
        const { data, error } = await supabase
            .from('sales_data')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }
        return data;
    } else {
        console.log('📄 Fetching data from Local CSV...');
        return new Promise((resolve, reject) => {
            const results = [];
            const csvPath = join(__dirname, 'data', 'sales_data.csv');

            if (!fs.existsSync(csvPath)) {
                return reject(new Error('Sales data file not found'));
            }

            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (data) => {
                    results.push({
                        ...data,
                        orders: parseInt(data.orders),
                        revenue: parseFloat(data.revenue),
                        cost: parseFloat(data.cost),
                        visitors: parseInt(data.visitors),
                        customers: parseInt(data.customers || 0)
                    });
                })
                .on('end', () => resolve(results))
                .on('error', (err) => reject(err));
        });
    }
}
