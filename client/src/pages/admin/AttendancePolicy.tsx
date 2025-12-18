import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Clock, MapPin, Smartphone, Save, AlertCircle } from "lucide-react";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import type { AttendancePolicy } from "@shared/schema";

const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
};

const minutesToTime = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export default function AttendancePolicy() {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        workStart: "09:00",
        workEnd: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        lateMinutesThreshold: 30,
        absentHoursThreshold: 2,
        halfDayHours: 4,
        fullDayHours: 8,
        lateMarkThreshold: 3,
        autoAbsentHours: 2,
        allowSelfCheckIn: true,
        requireGPS: false,
        requireDeviceBinding: false,
    });

    const { data: policy, isLoading } = useQuery<AttendancePolicy>({
        queryKey: ["/api/admin/attendance-policy"],
    });

    useEffect(() => {
        if (policy) {
            setFormData({
                workStart: policy.workStart || "09:00",
                workEnd: policy.workEnd || "18:00",
                breakStart: policy.breakStart || "13:00",
                breakEnd: policy.breakEnd || "14:00",
                lateMinutesThreshold: policy.lateMinutesThreshold || 30,
                absentHoursThreshold: policy.absentHoursThreshold || 2,
                halfDayHours: policy.halfDayHours,
                fullDayHours: policy.fullDayHours,
                lateMarkThreshold: policy.lateMarkThreshold,
                autoAbsentHours: policy.autoAbsentHours,
                allowSelfCheckIn: policy.allowSelfCheckIn,
                requireGPS: policy.requireGPS,
                requireDeviceBinding: policy.requireDeviceBinding,
            });
        }
    }, [policy]);

    const updatePolicyMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            return await apiRequest(
                `${API_BASE_URL}/api/admin/attendance-policy`,
                "POST",
                data
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/admin/attendance-policy"],
            });
            toast({
                title: "Policy Updated",
                description: "Attendance policy has been successfully updated.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Update Failed",
                description:
                    error.message ||
                    "Unable to update policy. Please try again.",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updatePolicyMutation.mutate(formData);
    };

    const handleReset = () => {
        if (policy) {
            setFormData({
                workStart: policy.workStart || "09:00",
                workEnd: policy.workEnd || "18:00",
                breakStart: policy.breakStart || "13:00",
                breakEnd: policy.breakEnd || "14:00",
                lateMinutesThreshold: policy.lateMinutesThreshold || 30,
                absentHoursThreshold: policy.absentHoursThreshold || 2,
                halfDayHours: policy.halfDayHours,
                fullDayHours: policy.fullDayHours,
                lateMarkThreshold: policy.lateMarkThreshold,
                autoAbsentHours: policy.autoAbsentHours,
                allowSelfCheckIn: policy.allowSelfCheckIn,
                requireGPS: policy.requireGPS,
                requireDeviceBinding: policy.requireDeviceBinding,
            });
        }
    };

    const calculateMetrics = () => {
        const workStartMins = timeToMinutes(formData.workStart);
        const workEndMins = timeToMinutes(formData.workEnd);
        const breakStartMins = timeToMinutes(formData.breakStart);
        const breakEndMins = timeToMinutes(formData.breakEnd);

        let totalWorkDuration = workEndMins - workStartMins;
        const breakDuration = breakEndMins - breakStartMins;
        const netWorkDuration = totalWorkDuration - breakDuration;

        const lateStartMins = workStartMins + formData.lateMinutesThreshold;
        const morningAbsentMins = workStartMins + (formData.absentHoursThreshold * 60);
        
        const afternoonLateMins = breakEndMins + formData.lateMinutesThreshold;
        const eveningAbsentMins = breakEndMins + (formData.absentHoursThreshold * 60);

        return {
            totalWorkDuration: `${Math.floor(netWorkDuration / 60)}h ${netWorkDuration % 60}m`,
            breakDuration: `${Math.floor(breakDuration / 60)}h ${breakDuration % 60}m`,
            morningLateTime: minutesToTime(lateStartMins),
            morningAbsentTime: minutesToTime(morningAbsentMins),
            afternoonLateTime: minutesToTime(afternoonLateMins),
            eveningAbsentTime: minutesToTime(eveningAbsentMins),
            autoCheckout: formData.workEnd,
        };
    };

    const metrics = calculateMetrics();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Attendance Policy Management
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Configure company-wide attendance rules and settings
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Core Work Timing */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Core Work Timing
                        </CardTitle>
                        <CardDescription>
                            Define the standard working hours and breaks for your company
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Work Start & End */}
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <span>Work Start & End</span>
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                                    Auto-calculates: {metrics.totalWorkDuration}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="workStart">
                                        Work Start Time
                                    </Label>
                                    <Input
                                        id="workStart"
                                        type="time"
                                        value={formData.workStart}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                workStart: e.target.value,
                                            })
                                        }
                                        data-testid="input-work-start"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="workEnd">
                                        Work End Time
                                    </Label>
                                    <Input
                                        id="workEnd"
                                        type="time"
                                        value={formData.workEnd}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                workEnd: e.target.value,
                                            })
                                        }
                                        data-testid="input-work-end"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Break Configuration */}
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <span>Break Configuration</span>
                                <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 px-2 py-1 rounded">
                                    Duration: {metrics.breakDuration}
                                </span>
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                No attendance actions during this window
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="breakStart">
                                        Break Start Time
                                    </Label>
                                    <Input
                                        id="breakStart"
                                        type="time"
                                        value={formData.breakStart}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                breakStart: e.target.value,
                                            })
                                        }
                                        data-testid="input-break-start"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="breakEnd">
                                        Break End / Work Resume
                                    </Label>
                                    <Input
                                        id="breakEnd"
                                        type="time"
                                        value={formData.breakEnd}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                breakEnd: e.target.value,
                                            })
                                        }
                                        data-testid="input-break-end"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Morning Rules */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Morning Rules
                        </CardTitle>
                        <CardDescription>
                            Define what constitutes late arrival and automatic absence in the morning
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <span>Late Starts (Morning)</span>
                                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 px-2 py-1 rounded">
                                    Triggers at: {metrics.morningLateTime}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                <Label htmlFor="lateMinutesThreshold">
                                    Input as minutes after Work Start
                                </Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="lateMinutesThreshold"
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={formData.lateMinutesThreshold}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                lateMinutesThreshold: parseInt(e.target.value) || 0,
                                            })
                                        }
                                        data-testid="input-late-minutes"
                                        className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground">minutes</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Example: 30 mins means arriving after {metrics.morningLateTime} is marked as late
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <span>Morning Absent</span>
                                <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 px-2 py-1 rounded">
                                    Triggers at: {metrics.morningAbsentTime}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                <Label htmlFor="absentHoursThreshold">
                                    Input as hours after Work Start
                                </Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="absentHoursThreshold"
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={formData.absentHoursThreshold}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                absentHoursThreshold: parseInt(e.target.value) || 1,
                                            })
                                        }
                                        data-testid="input-absent-hours"
                                        className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground">hours</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Example: 2 hrs means not arriving by {metrics.morningAbsentTime} is marked as absent
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Afternoon Rules */}
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            Afternoon Rules
                            <span className="text-xs font-normal bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">
                                SMART (Mirrors Morning)
                            </span>
                        </CardTitle>
                        <CardDescription>
                            Automatically mirrors morning rules after break
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-md space-y-4">
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <span>Late Starts (Afternoon)</span>
                                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 px-2 py-1 rounded">
                                        Auto-calculated: {metrics.afternoonLateTime}
                                    </span>
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Uses same {formData.lateMinutesThreshold} minutes threshold as morning
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Afternoon Late = Work Resume + {formData.lateMinutesThreshold} minutes
                                </p>
                            </div>

                            <div className="border-t dark:border-slate-700 pt-4">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <span>Evening Absent</span>
                                    <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 px-2 py-1 rounded">
                                        Auto-calculated: {metrics.eveningAbsentTime}
                                    </span>
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Uses same {formData.absentHoursThreshold} hours threshold as morning
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Evening Absent = Work Resume + {formData.absentHoursThreshold} hours
                                </p>
                            </div>
                        </div>

                        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md p-3 flex gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-300 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Afternoon rules automatically mirror your morning configuration. Update morning settings to change afternoon rules.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Automation */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Automation
                        </CardTitle>
                        <CardDescription>
                            System-managed checkout settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted p-4 rounded-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="font-semibold">
                                        Auto Checkout
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        System automatically checks out at
                                    </p>
                                </div>
                                <div className="text-2xl font-bold text-primary">
                                    {metrics.autoCheckout}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Legacy Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Legacy Work Hours Configuration
                        </CardTitle>
                        <CardDescription>
                            Define the standard working hours for your company
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="halfDayHours">
                                    Half Day Hours
                                </Label>
                                <Input
                                    id="halfDayHours"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={formData.halfDayHours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            halfDayHours: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-half-day-hours"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Minimum hours required for half-day
                                    attendance
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullDayHours">
                                    Full Day Hours
                                </Label>
                                <Input
                                    id="fullDayHours"
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={formData.fullDayHours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            fullDayHours: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-full-day-hours"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Minimum hours required for full-day
                                    attendance
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lateMarkThreshold">
                                    Late Mark Threshold (minutes)
                                </Label>
                                <Input
                                    id="lateMarkThreshold"
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={formData.lateMarkThreshold}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            lateMarkThreshold: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-late-threshold"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Grace period before marking as late (in
                                    minutes)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="autoAbsentHours">
                                    Auto Absent After (hours)
                                </Label>
                                <Input
                                    id="autoAbsentHours"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={formData.autoAbsentHours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            autoAbsentHours: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    data-testid="input-auto-absent-hours"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mark as absent if work hours are less than
                                    this threshold
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Attendance Settings
                        </CardTitle>
                        <CardDescription>
                            Configure check-in/out behavior and security
                            settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <Label htmlFor="allowSelfCheckIn">
                                        Allow Self Check-In
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Enable employees to mark their own
                                    attendance
                                </p>
                            </div>
                            <Switch
                                id="allowSelfCheckIn"
                                checked={formData.allowSelfCheckIn}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        allowSelfCheckIn: checked,
                                    })
                                }
                                data-testid="switch-self-checkin"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <Label htmlFor="requireGPS">
                                        Require GPS Location
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Mandate GPS location when checking in/out
                                </p>
                            </div>
                            <Switch
                                id="requireGPS"
                                checked={formData.requireGPS}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        requireGPS: checked,
                                    })
                                }
                                data-testid="switch-require-gps"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                                    <Label htmlFor="requireDeviceBinding">
                                        Require Device Binding
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Restrict attendance to registered devices
                                    only
                                </p>
                            </div>
                            <Switch
                                id="requireDeviceBinding"
                                checked={formData.requireDeviceBinding}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        requireDeviceBinding: checked,
                                    })
                                }
                                data-testid="switch-device-binding"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3 justify-end flex-wrap">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        data-testid="button-reset">
                        Reset Changes
                    </Button>
                    <Button
                        type="submit"
                        disabled={updatePolicyMutation.isPending}
                        data-testid="button-save-policy">
                        <Save className="w-4 h-4 mr-2" />
                        {updatePolicyMutation.isPending
                            ? "Saving..."
                            : "Save Policy"}
                    </Button>
                </div>
            </form>

            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-base">
                        Policy Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Last Updated:
                        </span>
                        <span className="font-medium">
                            {policy?.updatedAt
                                ? new Date(policy.updatedAt).toLocaleString()
                                : "Never"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Policy ID:
                        </span>
                        <span className="font-medium">
                            #{policy?.id || "N/A"}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
