"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";

export interface PasswordStrength {
    score: number; // 0-4
    label: string;
    color: string;
    bgColor: string;
}

export interface PasswordRequirement {
    label: string;
    met: boolean;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
    if (!password) {
        return { score: 0, label: "Weak", color: "text-red-600", bgColor: "bg-red-500" };
    }

    let score = 0;

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character variety
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Determine strength
    if (score <= 1) {
        return { score: 1, label: "Weak", color: "text-red-600", bgColor: "bg-red-500" };
    } else if (score === 2) {
        return { score: 2, label: "Fair", color: "text-orange-600", bgColor: "bg-orange-500" };
    } else if (score === 3) {
        return { score: 3, label: "Good", color: "text-yellow-600", bgColor: "bg-yellow-500" };
    } else if (score === 4) {
        return { score: 4, label: "Strong", color: "text-emerald-600", bgColor: "bg-emerald-500" };
    } else {
        return { score: 5, label: "Very Strong", color: "text-emerald-700", bgColor: "bg-emerald-600" };
    }
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
    return [
        {
            label: "At least 8 characters",
            met: password.length >= 8,
        },
        {
            label: "Contains uppercase letter (A-Z)",
            met: /[A-Z]/.test(password),
        },
        {
            label: "Contains lowercase letter (a-z)",
            met: /[a-z]/.test(password),
        },
        {
            label: "Contains number (0-9)",
            met: /\d/.test(password),
        },
        {
            label: "Contains special character (!@#$...)",
            met: /[^a-zA-Z0-9]/.test(password),
        },
    ];
}

interface PasswordStrengthMeterProps {
    password: string;
    showRequirements?: boolean;
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
    const strength = useMemo(() => calculatePasswordStrength(password), [password]);
    const requirements = useMemo(() => getPasswordRequirements(password), [password]);

    if (!password) return null;

    return (
        <div className="mt-3 space-y-3">
            {/* Strength Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">Password Strength</span>
                    <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                        <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${level <= strength.score ? strength.bgColor : "bg-gray-200"
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Requirements List */}
            {showRequirements && (
                <div className="space-y-1.5">
                    {requirements.map((req, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <div className={`mt-0.5 ${req.met ? "text-emerald-600" : "text-gray-400"}`}>
                                {req.met ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </div>
                            <span className={`text-xs ${req.met ? "text-emerald-700" : "text-gray-500"}`}>
                                {req.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
