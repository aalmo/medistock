export type Locale = "en" | "ar" | "de"

export interface Translation {
  // ── Navigation ──────────────────────────────────────────────────────────
  nav: {
    dashboard:     string
    patients:      string
    medications:   string
    schedules:     string
    inventory:     string
    packages:      string
    notifications: string
    settings:      string
    signOut:       string
  }

  // ── Common ───────────────────────────────────────────────────────────────
  common: {
    save:        string
    saving:      string
    cancel:      string
    add:         string
    edit:        string
    delete:      string
    confirm:     string
    refresh:     string
    search:      string
    loading:     string
    noData:      string
    allCaughtUp: string
    actions:     string
    status:      string
    notes:       string
    optional:    string
    error:       string
    success:     string
    close:       string
    yes:         string
    no:          string
    total:       string
    today:       string
    yesterday:   string
    days:        string
    daysLeft:    string
    daysAgo:     string
    pending:     string
    taken:       string
    missed:      string
    soon:        string
    allPatients: string
    language:    string
  }

  // ── Dashboard ─────────────────────────────────────────────────────────
  dashboard: {
    title:              string
    totalPatients:      string
    underActiveCare:    string
    dueToday:           string
    stillPending:       string
    allDone:            string
    adherenceRate:      string
    last30Days:         string
    onTrack:            string
    needsAttention:     string
    critical:           string
    lowStockAlerts:     string
    allStockedUp:       string
    needRestocking:     string
    allGood:            string
    expiredPackages:    string
    noneExpired:        string
    disposeNow:         string
    actionRequired:     string
    allClear:           string
    expiringLabel:      string
    allDatesOk:         string
    checkPackages:      string
    todayProgress:      string
    dosesCompleted:     string
    inventoryStatus:    string
    stockVsThreshold:   string
    adherenceTrend:     string
    last7Days:          string
    upcomingDoses:      string
    next24h:            string
    pendingOnly:        string
    fullCalendar:       string
  }

  // ── Patients ─────────────────────────────────────────────────────────
  patients: {
    title:         string
    subtitle:      string
    addPatient:    string
    searchPlaceholder: string
    noPatients:    string
    noPatientsHint:string
    age:           string
    dob:           string
    medications:   string
    medication:    string
  }

  // ── Inventory ─────────────────────────────────────────────────────────
  inventory: {
    title:           string
    needAttention:   string
    allStocked:      string
    criticalLabel:   string
    lowStockLabel:   string
    inStockLabel:    string
    patientMed:      string
    inStock:         string
    avgDay:          string
    daysLeft:        string
    restock:         string
    restockTitle:    string
    current:         string
    afterRestock:    string
    unitsToAdd:      string
    confirmRestock:  string
    supplyAfter:     string
    perDay:          string
    noData:          string
    noDataHint:      string
  }

  // ── Notifications ─────────────────────────────────────────────────────
  notifications: {
    title:       string
    unread:      string
    totalLabel:  string
    alerts:      string
    markAllRead: string
    all:         string
    noUnread:    string
    noNotifs:    string
    emailSent:   string
    types: {
      LOW_STOCK:     string
      EXPIRY_ALERT:  string
      REMINDER:      string
      MISSED_DOSE:   string
      DAILY_SUMMARY: string
      RESTOCK_ALERT: string
      AUTO_COMPLETE: string
      DEFAULT:       string
    }
  }

  // ── Packages ─────────────────────────────────────────────────────────
  packages: {
    title:           string
    subtitle:        string
    addPackage:      string
    editPackage:     string
    expired:         string
    criticalLabel:   string
    warningLabel:    string
    goodLabel:       string
    noPackages:      string
    noPackagesHint:  string
    lotNumber:       string
    lotPlaceholder:  string
    expiryDate:      string
    quantity:        string
    opened:          string
    openedDesc:      string
    addAnother:      string
    nextExpiry:      string
    filterAll:       string
    medication:      string
    daysAgo:         string
    disposeNow:      string
    expiresIn:       string
  }

  // ── Schedules ─────────────────────────────────────────────────────────
  schedules: {
    title:       string
    subtitle:    string
    weeklyView:  string
    noDoses:     string
    noDosesHint: string
    markTaken:   string
    markMissed:  string
    dose:        string
  }

  // ── Medications ───────────────────────────────────────────────────────
  medications: {
    title:      string
    subtitle:   string
    addMed:     string
    noMeds:     string
    noMedsHint: string
    strength:   string
    category:   string
    searchMeds: string
  }

  // ── Settings ─────────────────────────────────────────────────────────
  settings: {
    title:                string
    subtitle:             string
    saveChanges:          string
    saveAll:              string
    account:              string
    accountSubtitle:      string
    fullName:             string
    emailAddress:         string
    emailHint:            string
    timezone:             string
    timezoneSubtitle:     string
    yourTimezone:         string
    emailNotifs:          string
    emailNotifsSubtitle:  string
    sendEmailAlerts:      string
    receiveAlerts:        string
    alertLevel:           string
    alertLevelHint:       string
    off:                  string
    noEmails:             string
    criticalOnly:         string
    redAlertsOnly:        string
    lowCritical:          string
    yellowRedAlerts:      string
    lowStockThreshold:    string
    expiryThreshold:      string
    testEmail:            string
    testEmailDesc:        string
    sendTestEmail:        string
    sending:              string
    emailSent:            string
    inAppNotifs:          string
    inAppSubtitle:        string
    doseReminders:        string
    doseRemindersDesc:    string
    lowStockAlertsLabel:  string
    lowStockAlertsDesc:   string
    autoCompleteLabel:    string
    autoCompleteDesc:     string
    preferencesFor:       string
    smtpSetup:            string
    days:                 string
    urgent:               string
    early:                string
    months6:              string
  }
}

