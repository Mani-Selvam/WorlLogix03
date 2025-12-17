import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, LogIn, LogOut, Users, Flame, Star, Award, Target, Zap, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { AttendanceBadge, AttendancePolicy } from "@shared/schema";

interface AttendanceRecord {
    id: number;
    userId: number;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    workDuration: number | null;
    status: string;
}

interface TeamMemberAttendance {
    userId: number;
    fullName: string;
    email: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    workDuration: number | null;
}

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    earlyBirdCount: number;
    onTimeCount: number;
    lateCount: number;
    absentCount: number;
    totalWorkingDays: number;
}

export default function TeamLeaderAttendance() {
    const { dbUserId } = useAuth();
    const { toast } = useToast();

    const { data: todayRecord, isLoading: loadingToday } =
        useQuery<AttendanceRecord>({
            queryKey: ["/api/attendance/today"],
            enabled: !!dbUserId,
            refetchInterval: 30000, // Refresh every 30 seconds
        });

    const { data: recentAttendance = [], isLoading: loadingHistory } = useQuery<
        AttendanceRecord[]
    >({
        queryKey: ["/api/attendance/history"],
        enabled: !!dbUserId,
    });

    const { data: badges } = useQuery<AttendanceBadge[]>({
        queryKey: ["/api/attendance/badges"],
        enabled: !!dbUserId,
    });

    const { data: streak } = useQuery<StreakData>({
        queryKey: ["/api/attendance/streak"],
        enabled: !!dbUserId,
    });

    const { data: policyData } = useQuery<{
        policy: AttendancePolicy;
        shift: { startTime: string; endTime: string } | null;
    }>({
        queryKey: ["/api/attendance/policy"],
        enabled: !!dbUserId,
    });

    const { data: teamAttendance = [] } = useQuery<TeamMemberAttendance[]>({
        queryKey: ["/api/team-leader/team-attendance/today"],
        enabled: !!dbUserId,
        refetchInterval: 60000,
    });

    const checkInMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(
                `${API_BASE_URL}/api/attendance/check-in`,
                "POST",
                {}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/today"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/history"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/streak"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/badges"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/team-leader/team-attendance/today"],
            });
            toast({ title: "Success", description: "Checked in successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to check in",
                variant: "destructive",
            });
        },
    });

    const checkOutMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(
                `${API_BASE_URL}/api/attendance/check-out`,
                "POST",
                {}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/today"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/history"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/streak"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/attendance/badges"],
            });
            queryClient.invalidateQueries({
                queryKey: ["/api/team-leader/team-attendance/today"],
            });
            toast({
                title: "Success",
                description: "Checked out successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to check out",
                variant: "destructive",
            });
        },
    });

    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return "Not recorded";
        return format(new Date(timeStr), "hh:mm a");
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0h 0m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "present":
                return <Badge variant="default">Present</Badge>;
            case "late":
                return <Badge variant="secondary">Late</Badge>;
            case "absent":
                return <Badge variant="destructive">Absent</Badge>;
            case "on_leave":
                return <Badge variant="outline">On Leave</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loadingToday || loadingHistory) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-5 w-72" />
                </div>
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    const presentCount = teamAttendance.filter(m => m.status === 'present' || m.status === 'late').length;
    const lateTeamCount = teamAttendance.filter(m => m.status === 'late').length;
    const onLeaveCount = teamAttendance.filter(m => m.status === 'leave' || m.status === 'on_leave').length;
    const absentTeamCount = teamAttendance.filter(m => m.status === 'absent' || (!m.checkIn && !m.status)).length;
    const totalTeamMembers = teamAttendance.length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Attendance</h1>
                <p className="text-muted-foreground">
                    Track your attendance and manage your team
                </p>
            </div>

            {totalTeamMembers > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Team Attendance Today
                        </CardTitle>
                        <CardDescription>Overview of your team's attendance status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-5">
                            <div className="text-center p-4 border rounded-md">
                                <div className="flex items-center justify-center gap-1">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-2xl font-bold" data-testid="text-total-team">
                                        {totalTeamMembers}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                            <div className="text-center p-4 border rounded-md bg-gradient-to-br from-green-500/5 to-green-500/10">
                                <div className="flex items-center justify-center gap-1">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <p className="text-2xl font-bold text-green-600" data-testid="text-present-count">
                                        {presentCount}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">Present</p>
                            </div>
                            <div className="text-center p-4 border rounded-md bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
                                <div className="flex items-center justify-center gap-1">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    <p className="text-2xl font-bold text-yellow-600" data-testid="text-late-team">
                                        {lateTeamCount}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">Late</p>
                            </div>
                            <div className="text-center p-4 border rounded-md bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                                <div className="flex items-center justify-center gap-1">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <p className="text-2xl font-bold text-blue-600" data-testid="text-leave-team">
                                        {onLeaveCount}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">On Leave</p>
                            </div>
                            <div className="text-center p-4 border rounded-md bg-gradient-to-br from-red-500/5 to-red-500/10">
                                <div className="flex items-center justify-center gap-1">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <p className="text-2xl font-bold text-red-600" data-testid="text-absent-team">
                                        {absentTeamCount}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">Absent</p>
                            </div>
                        </div>
                        {teamAttendance.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium">Team Members</p>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {teamAttendance.map((member) => (
                                        <div
                                            key={member.userId}
                                            className="flex flex-wrap items-center justify-between gap-2 p-2 border rounded-md"
                                            data-testid={`team-member-${member.userId}`}
                                        >
                                            <span className="text-sm font-medium">{member.fullName}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTime(member.checkIn)}
                                                </span>
                                                {getStatusBadge(member.status || 'absent')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Today's Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-md">
                                <LogIn className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Clock In
                                </p>
                                <p
                                    className="text-lg font-semibold"
                                    data-testid="text-clock-in">
                                    {formatTime(todayRecord?.checkIn || null)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                                <LogOut className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Clock Out
                                </p>
                                <p
                                    className="text-lg font-semibold"
                                    data-testid="text-clock-out">
                                    {formatTime(todayRecord?.checkOut || null)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Total Hours Today:
                            </span>
                            <span
                                className="font-semibold"
                                data-testid="text-total-hours">
                                {formatDuration(
                                    todayRecord?.workDuration || null
                                )}
                            </span>
                        </div>
                        {todayRecord?.status &&
                            getStatusBadge(todayRecord.status)}
                    </div>
                    <div className="flex gap-2">
                        {!todayRecord?.checkIn && (
                            <Button
                                onClick={() => checkInMutation.mutate()}
                                disabled={checkInMutation.isPending}
                                data-testid="button-clock-in">
                                <LogIn className="h-4 w-4 mr-2" />
                                {checkInMutation.isPending
                                    ? "Checking In..."
                                    : "Clock In"}
                            </Button>
                        )}
                        {todayRecord?.checkIn && !todayRecord?.checkOut && (
                            <Button
                                onClick={() => checkOutMutation.mutate()}
                                disabled={checkOutMutation.isPending}
                                data-testid="button-clock-out">
                                <LogOut className="h-4 w-4 mr-2" />
                                {checkOutMutation.isPending
                                    ? "Checking Out..."
                                    : "Clock Out"}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentAttendance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-muted-foreground">
                                No attendance history found
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentAttendance.slice(0, 10).map((record) => (
                                <div
                                    key={record.id}
                                    className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b last:border-0"
                                    data-testid={`attendance-record-${record.id}`}>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                            {format(
                                                new Date(record.date),
                                                "MMM dd, yyyy"
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground">
                                            {formatTime(record.checkIn)} -{" "}
                                            {formatTime(record.checkOut)}
                                        </span>
                                        <span className="font-medium">
                                            {formatDuration(
                                                record.workDuration
                                            )}
                                        </span>
                                        {getStatusBadge(record.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flame className="h-5 w-5" />
                            My Streak
                        </CardTitle>
                        <CardDescription>Your attendance performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 border rounded-md bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                                <div className="flex items-center justify-center gap-1">
                                    <Flame className="h-4 w-4 text-orange-500" />
                                    <p className="text-xl font-bold text-orange-500" data-testid="text-current-streak">
                                        {streak?.currentStreak || 0}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">Current</p>
                            </div>
                            <div className="text-center p-3 border rounded-md bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
                                <div className="flex items-center justify-center gap-1">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <p className="text-xl font-bold text-yellow-500" data-testid="text-longest-streak">
                                        {streak?.longestStreak || 0}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">Best</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                            <div className="p-2 border rounded-md">
                                <p className="text-sm font-semibold text-green-600">{streak?.earlyBirdCount || 0}</p>
                                <p className="text-xs text-muted-foreground">Early</p>
                            </div>
                            <div className="p-2 border rounded-md">
                                <p className="text-sm font-semibold text-blue-600">{streak?.onTimeCount || 0}</p>
                                <p className="text-xs text-muted-foreground">On Time</p>
                            </div>
                            <div className="p-2 border rounded-md">
                                <p className="text-sm font-semibold text-red-600">{streak?.lateCount || 0}</p>
                                <p className="text-xs text-muted-foreground">Late</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            My Badges
                        </CardTitle>
                        <CardDescription>Your attendance achievements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {badges && badges.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {badges.map((badge) => (
                                    <div
                                        key={badge.id}
                                        className="flex items-center gap-2 p-2 border rounded-md bg-gradient-to-r from-primary/5 to-primary/10"
                                        data-testid={`badge-${badge.id}`}
                                    >
                                        {badge.badgeType === 'early_bird' && <Zap className="h-4 w-4 text-yellow-500" />}
                                        {badge.badgeType === 'streak' && <Flame className="h-4 w-4 text-orange-500" />}
                                        {badge.badgeType === 'perfect_month' && <Target className="h-4 w-4 text-green-500" />}
                                        <div>
                                            <p className="text-sm font-medium">{badge.badgeName}</p>
                                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-6 text-muted-foreground">
                                <Award className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No badges yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Policy Rules
                        </CardTitle>
                        <CardDescription>Company attendance rules</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {policyData?.shift && (
                                <div className="flex justify-between items-center p-2 border rounded-md">
                                    <span className="text-sm text-muted-foreground">Shift</span>
                                    <span className="text-sm font-medium">
                                        {policyData.shift.startTime} - {policyData.shift.endTime}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm text-muted-foreground">Late After</span>
                                <Badge variant="outline">
                                    {policyData?.policy?.lateMarkThreshold || 3} min
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm text-muted-foreground">Half Day</span>
                                <Badge variant="outline">
                                    {policyData?.policy?.halfDayHours || 4} hrs
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm text-muted-foreground">Full Day</span>
                                <Badge variant="outline">
                                    {policyData?.policy?.fullDayHours || 8} hrs
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
