'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { RevenueChartData, StatusDistributionData } from '@/backend/models/Dashboard';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

export function RevenueChart({ data }: { data: RevenueChartData }) {
    const chartData = {
        labels: data.labels,
        datasets: [
            {
                label: 'Receita (R$)',
                data: data.values,
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // brand blue
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f0f0f0',
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        },
    };

    return <Bar options={options} data={chartData} />;
}

export function StatusChart({ data }: { data: StatusDistributionData }) {
    const chartData = {
        labels: data.labels,
        datasets: [
            {
                data: data.values,
                backgroundColor: data.colors,
                borderWidth: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8
                }
            },
        },
        cutout: '70%',
    };

    return <Doughnut options={options} data={chartData} />;
}
