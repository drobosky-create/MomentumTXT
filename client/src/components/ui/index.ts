// Universal Design System - Single Export Point
// This ensures consistent imports across the entire application
// Usage: import { Button, Card, Typography, KPICard } from '@/components/ui'

// Core UI Primitives
export { Button, buttonVariants } from "./button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./card";
export { Input } from "./input";
export { Label } from "./label";
export { Badge } from "./badge";
export { Separator } from "./separator";

// Form Components
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
export { Textarea } from "./textarea";
export { Checkbox } from "./checkbox";
export { Switch } from "./switch";

// Layout & Navigation
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
export { Popover, PopoverContent, PopoverTrigger } from "./popover";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// Data Display
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
export { Avatar, AvatarFallback, AvatarImage } from "./avatar";
export { Progress } from "./progress";

// Feedback & Status
export { Alert, AlertDescription, AlertTitle } from "./alert";
export { useToast } from "@/hooks/use-toast";
export { Toaster } from "./toaster";

// Universal Typography - Single Source of Truth for Text
export { Typography, typographyVariants } from "./typography";

// KPI Components - Core to Momentum Platform
export { KPICard, TrendIcon, MiniSparkline } from "./kpi-card";

// Layout Components - Universal page structure
export { PageLayout, PageHeader, ContentSection } from "../layout/page-layout";
