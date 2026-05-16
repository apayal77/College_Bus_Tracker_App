/**
 * AppIcon — Reusable vector icon component
 *
 * Props:
 *   name    — icon name within the chosen family
 *   type    — 'Ionicons' | 'MaterialIcons' | 'FontAwesome' | 'MaterialCommunityIcons'
 *   size    — px size (default 24)
 *   color   — hex / rgba color (default '#f1f5f9' – theme white)
 *   style   — optional extra ViewStyle
 */

import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

// Icon family imports
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Types ────────────────────────────────────────────────────────────────────
export type IconFamily =
  | 'Ionicons'
  | 'MaterialIcons'
  | 'FontAwesome'
  | 'MaterialCommunityIcons';

interface AppIconProps {
  name: string;
  type?: IconFamily;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

// ─── Fallback for invalid icon names ─────────────────────────────────────────
const FALLBACK_ICON: Record<IconFamily, string> = {
  Ionicons: 'help-circle-outline',
  MaterialIcons: 'help-outline',
  FontAwesome: 'question-circle',
  MaterialCommunityIcons: 'help-circle-outline',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AppIcon({
  name,
  type = 'MaterialCommunityIcons',
  size = 24,
  color = '#f1f5f9',
  style,
}: AppIconProps) {
  const iconProps = { size, color, style };

  try {
    switch (type) {
      case 'Ionicons':
        return <Ionicons name={name} {...iconProps} />;
      case 'MaterialIcons':
        return <MaterialIcons name={name} {...iconProps} />;
      case 'FontAwesome':
        return <FontAwesome name={name} {...iconProps} />;
      case 'MaterialCommunityIcons':
      default:
        return <MaterialCommunityIcons name={name} {...iconProps} />;
    }
  } catch (_err) {
    // If the icon name is invalid, render a safe fallback
    const fallback = FALLBACK_ICON[type];
    return (
      <Text style={{ color, fontSize: size }}>?</Text>
    );
  }
}

// ─── Named icon presets (import these in screens for auto-complete) ───────────
export const ICONS = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  phone: { name: 'phone', type: 'MaterialCommunityIcons' as IconFamily },
  otp: { name: 'numeric', type: 'MaterialCommunityIcons' as IconFamily },
  shield: { name: 'shield-check', type: 'MaterialCommunityIcons' as IconFamily },
  success: { name: 'check-circle', type: 'MaterialCommunityIcons' as IconFamily },
  error: { name: 'alert-circle', type: 'MaterialCommunityIcons' as IconFamily },
  logout: { name: 'logout', type: 'MaterialCommunityIcons' as IconFamily },
  back: { name: 'arrow-left', type: 'MaterialCommunityIcons' as IconFamily },

  // ── Navigation / Dashboard ────────────────────────────────────────────────
  home: { name: 'home', type: 'MaterialCommunityIcons' as IconFamily },
  map: { name: 'map-marker-radius', type: 'MaterialCommunityIcons' as IconFamily },
  notifications: { name: 'bell', type: 'MaterialCommunityIcons' as IconFamily },
  profile: { name: 'account-circle', type: 'MaterialCommunityIcons' as IconFamily },
  settings: { name: 'cog', type: 'MaterialCommunityIcons' as IconFamily },
  routes: { name: 'routes', type: 'MaterialCommunityIcons' as IconFamily },

  // ── Student ───────────────────────────────────────────────────────────────
  liveTracking: { name: 'radar', type: 'MaterialCommunityIcons' as IconFamily },
  stopMarker: { name: 'map-marker', type: 'MaterialCommunityIcons' as IconFamily },
  myLocation: { name: 'crosshairs-gps', type: 'MaterialCommunityIcons' as IconFamily },
  refreshTracking: { name: 'refresh', type: 'MaterialCommunityIcons' as IconFamily },

  // ── Driver ────────────────────────────────────────────────────────────────
  startTrip: { name: 'play-circle', type: 'MaterialCommunityIcons' as IconFamily },
  stopTrip: { name: 'stop-circle', type: 'MaterialCommunityIcons' as IconFamily },
  routeDetails: { name: 'map-legend', type: 'MaterialCommunityIcons' as IconFamily },
  tripHistory: { name: 'history', type: 'MaterialCommunityIcons' as IconFamily },
  gpsOn: { name: 'satellite-uplink', type: 'MaterialCommunityIcons' as IconFamily },
  gpsOff: { name: 'satellite-off', type: 'MaterialCommunityIcons' as IconFamily },
  bus: { name: 'bus', type: 'MaterialCommunityIcons' as IconFamily },

  // ── Admin ─────────────────────────────────────────────────────────────────
  addStudent: { name: 'account-plus', type: 'MaterialCommunityIcons' as IconFamily },
  addDriver: { name: 'card-account-details', type: 'MaterialCommunityIcons' as IconFamily },
  createRoute: { name: 'road-variant', type: 'MaterialCommunityIcons' as IconFamily },
  assignRoute: { name: 'transit-connection-variant', type: 'MaterialCommunityIcons' as IconFamily },
  editUser: { name: 'account-edit', type: 'MaterialCommunityIcons' as IconFamily },
  deleteUser: { name: 'account-remove', type: 'MaterialCommunityIcons' as IconFamily },
  monitor: { name: 'monitor-eye', type: 'MaterialCommunityIcons' as IconFamily },
  manageStudents: { name: 'account-group', type: 'MaterialCommunityIcons' as IconFamily },
  manageDrivers: { name: 'steering', type: 'MaterialCommunityIcons' as IconFamily },
  fleet: { name: 'bus-multiple', type: 'MaterialCommunityIcons' as IconFamily },

  // ── Map ───────────────────────────────────────────────────────────────────
  busMarker: { name: 'bus-marker', type: 'MaterialCommunityIcons' as IconFamily },
  chevronRight: { name: 'chevron-right', type: 'MaterialCommunityIcons' as IconFamily },
  info: { name: 'information', type: 'MaterialCommunityIcons' as IconFamily },
  signal: { name: 'signal', type: 'MaterialCommunityIcons' as IconFamily },
  signalOff: { name: 'signal-off', type: 'MaterialCommunityIcons' as IconFamily },

  // ── Stop items ────────────────────────────────────────────────────────────
  stop: { name: 'map-marker-check', type: 'MaterialCommunityIcons' as IconFamily },
  stopList: { name: 'format-list-bulleted', type: 'MaterialCommunityIcons' as IconFamily },
};
