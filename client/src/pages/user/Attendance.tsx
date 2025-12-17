import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogIn, LogOut, Calendar, Award, FileText, Flame, Target, Zap, Star } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient, API_BASE_URL } from "@/lib/queryClient";
import type { AttendanceRecord, Reward, AttendanceBadge, AttendanceStreak, AttendancePolicy } from "@shared/schema";

export default function Attendance() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayAttendance, isLoading } = useQuery<AttendanceRecord | null>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: rewards } = useQuery<Reward[]>({
    queryKey: ["/api/attendance/my-rewards"],
  });

  const { data: badges } = useQuery<AttendanceBadge[]>({
    queryKey: ["/api/attendance/badges"],
  });

  const { data: streak } = useQuery<{
    currentStreak: number;
    longestStreak: number;
    earlyBirdCount: number;
    onTimeCount: number;
    lateCount: number;
    absentCount: number;
    totalWorkingDays: number;
  }>({
    queryKey: ["/api/attendance/streak"],
  });

  const { data: policyData } = useQuery<{
    policy: AttendancePolicy;
    shift: { startTime: string; endTime: string } | null;
  }>({
    queryKey: ["/api/attendance/policy"],
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`${API_BASE_URL}/api/attendance/check-in`, "POST", {
        gpsLocation: null,
        deviceId: navigator.userAgent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/streak"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/badges"] });
      toast({
        title: "Checked In Successfully",
        description: "Your attendance has been marked for today.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Unable to check in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`${API_BASE_URL}/api/attendance/check-out`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({
        title: "Checked Out Successfully",
        description: "Your checkout time has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out Failed",
        description: error.message || "Unable to check out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markLeaveMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest(`${API_BASE_URL}/api/attendance/mark-leave`, "POST", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      setLeaveDialogOpen(false);
      setLeaveReason("");
      toast({
        title: "Leave Marked Successfully",
        description: "Your attendance has been marked as leave for today.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Mark Leave",
        description: error.message || "Unable to mark leave. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMarkLeave = () => {
    if (leaveReason.trim().length < 10) {
      toast({
        title: "Validation Error",
        description: "Reason must be at least 10 characters long.",
        variant: "destructive",
      });
      return;
    }
    markLeaveMutation.mutate(leaveReason);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      present: { variant: "default", label: "Present" },
      absent: { variant: "destructive", label: "Absent" },
      late: { variant: "secondary", label: "Late" },
      leave: { variant: "outline", label: "On Leave" },
    };
    const config = variants[status] || variants.absent;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalRewardPoints = rewards?.reduce((sum, r) => sum + r.points, 0) || 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Track your daily attendance and view your records
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Attendance
            </CardTitle>
            <CardDescription>
              {format(currentTime, "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-mono">{format(currentTime, "HH:mm:ss")}</span>
              </div>
              {todayAttendance && getStatusBadge(todayAttendance.status)}
            </div>

            {todayAttendance && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Check-In</p>
                  <p className="text-lg font-medium" data-testid="text-checkin-time">
                    {todayAttendance.checkIn
                      ? format(new Date(todayAttendance.checkIn), "hh:mm a")
                      : "Not checked in"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-Out</p>
                  <p className="text-lg font-medium" data-testid="text-checkout-time">
                    {todayAttendance.checkOut
                      ? format(new Date(todayAttendance.checkOut), "hh:mm a")
                      : "Not checked out"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-lg font-medium" data-testid="text-duration">
                    {formatDuration(todayAttendance.workDuration)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {!todayAttendance?.checkIn && !todayAttendance?.status && (
                <>
                  <Button
                    onClick={() => checkInMutation.mutate()}
                    disabled={checkInMutation.isPending}
                    className="flex-1"
                    data-testid="button-checkin"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Check In
                  </Button>
                  <Button
                    onClick={() => setLeaveDialogOpen(true)}
                    disabled={markLeaveMutation.isPending}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-mark-leave"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Mark as Leave
                  </Button>
                </>
              )}
              {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                <Button
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-checkout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              )}
              {todayAttendance?.checkOut && (
                <div className="flex-1 p-3 text-center border rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">
                    You have completed your attendance for today
                  </p>
                </div>
              )}
              {todayAttendance?.status === 'leave' && (
                <div className="flex-1 p-3 text-center border rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">
                    You are marked as on leave for today
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5" />
              Attendance Streak
            </CardTitle>
            <CardDescription>Your attendance performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 border rounded-md bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <p className="text-2xl font-bold text-orange-500" data-testid="text-current-streak">
                      {streak?.currentStreak || 0}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                </div>
                <div className="text-center p-4 border rounded-md bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-500" data-testid="text-longest-streak">
                      {streak?.longestStreak || 0}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 border rounded-md">
                  <p className="text-lg font-semibold text-green-600" data-testid="text-early-bird">
                    {streak?.earlyBirdCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Early</p>
                </div>
                <div className="p-2 border rounded-md">
                  <p className="text-lg font-semibold text-blue-600" data-testid="text-on-time">
                    {streak?.onTimeCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">On Time</p>
                </div>
                <div className="p-2 border rounded-md">
                  <p className="text-lg font-semibold text-red-600" data-testid="text-late-count">
                    {streak?.lateCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Badges Earned
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
                    {badge.badgeType === 'early_bird' && <Zap className="w-4 h-4 text-yellow-500" />}
                    {badge.badgeType === 'streak' && <Flame className="w-4 h-4 text-orange-500" />}
                    {badge.badgeType === 'perfect_month' && <Target className="w-4 h-4 text-green-500" />}
                    <div>
                      <p className="text-sm font-medium">{badge.badgeName}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No badges earned yet</p>
                <p className="text-xs">Keep checking in on time to earn badges!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Policy Rules
            </CardTitle>
            <CardDescription>Your company attendance rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {policyData?.shift && (
                <div className="flex justify-between items-center p-2 border rounded-md">
                  <span className="text-sm text-muted-foreground">Shift Timing</span>
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
                  {policyData?.policy?.halfDayHours || 4} hours
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 border rounded-md">
                <span className="text-sm text-muted-foreground">Full Day</span>
                <Badge variant="outline">
                  {policyData?.policy?.fullDayHours || 8} hours
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Leave</DialogTitle>
            <DialogDescription>
              Please provide a reason for marking today as leave. This will be visible to your admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your reason for leave (minimum 10 characters)..."
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-leave-reason"
            />
            <p className="text-sm text-muted-foreground">
              {leaveReason.length}/10 characters minimum
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLeaveDialogOpen(false);
                setLeaveReason("");
              }}
              data-testid="button-cancel-leave"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkLeave}
              disabled={markLeaveMutation.isPending || leaveReason.trim().length < 10}
              data-testid="button-submit-leave"
            >
              {markLeaveMutation.isPending ? "Submitting..." : "Submit Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
