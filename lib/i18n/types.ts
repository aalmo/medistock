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
    disclaimer:  string
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
    title:              string
    subtitle:           string
    addPatient:         string
    searchPlaceholder:  string
    noPatients:         string
    noPatientsHint:     string
    age:                string
    dob:                string
    medications:        string
    medication:         string
    addMedication:      string
    editPatient:        string
    inStock:            string
    critical:           string
    lowStock:           string
    daysLeft:           string
    perDay:             string
    stockLevel:         string
    noMedications:      string
    noMedicationsHint:  string
    todaysDoses:        string
    history:            string
    noDosesToday:       string
    packages:           string
    nextExpiry:         string
    male:               string
    female:             string
  }

  // ── Edit Patient Page ─────────────────────────────────────────────────
  editPatientPage: {
    title:              string
    cardTitle:          string
    fullName:           string
    fullNamePlaceholder: string
    dob:                string
    gender:             string
    genderPlaceholder:  string
    male:               string
    female:             string
    other:              string
    phone:              string
    email:              string
    notes:              string
    notesPlaceholder:   string
    avatarUrl:          string
    avatarUrlOptional:  string
    saveChanges:        string
    cancel:             string
    updateSuccess:      string
    updateError:        string
    updateErrorFallback: string
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
    expiryDate:      string
    lotNumber:       string
    lotOptional:     string
    restockAdded:    string
    restockFailed:   string
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
    package:         string
    packages:        string
    dosesPerPackage: string
    expires:         string
    untilExpiry:     string
    daysSupply:      string
    openedLabel:     string
    lotLabel:        string
    addAnotherBtn:   string
    deleteConfirmPkg: string
    quantityUnit:    string
    editTitle:       string
    deleteTitle:     string
    saveFailed:      string
    medAndExpiryRequired: string
  }

  // ── Schedules ─────────────────────────────────────────────────────────
  schedules: {
    title:              string
    subtitle:           string
    weeklyView:         string
    noDoses:            string
    noDosesHint:        string
    markTaken:          string
    markMissed:         string
    dose:               string
    currentWeek:        string
    today:              string
    allActiveSchedules: string
    active:             string
    inactive:           string
    taken:              string
    missed:             string
    pending:            string
    more:               string
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
    all:              string
    notAssigned:      string
    patients:         string
    addPhoto:         string
    changePhoto:      string
    activeIngredients: string
    deleteFromCatalog: string
    deleteConfirm:    string
    deleted:          string
    deleteFailed:     string
    uploadFailed:     string
    photoUpdated:     string
    medsAppearHint:   string
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
    emailDigestFreq:      string
    emailDigestFreqHint:  string
    digestRealtime:       string
    digestRealtimeDesc:   string
    digestDaily:          string
    digestDailyDesc:      string
    digestWeekly:         string
    digestWeeklyDesc:     string
    drugDatabase:         string
    drugDatabaseSubtitle: string
    usDatabase:           string
    usDatabaseDesc:       string
    euDatabase:           string
    euDatabaseDesc:       string
  }

  // ── Add Medication Dialog ─────────────────────────────────────────────
  addMedDialog: {
    step1Title:       string
    step2Title:       string
    step3Title:       string
    searchHint:       string
    searchPlaceholder: string
    orManual:         string
    medNamePlaceholder: string
    use:              string
    frequency:        string
    onceDailyLabel:   string
    twiceDailyLabel:  string
    threeTimesLabel:  string
    fourTimesLabel:   string
    weeklyLabel:      string
    asNeededLabel:    string
    timesOfDay:       string
    daysOfWeek:       string
    mon: string; tue: string; wed: string; thu: string
    fri: string; sat: string; sun: string
    pillsPerDose:     string
    pillsPerDoseHint: string
    unitType:         string
    packageDetails:   string
    numPackages:      string
    perPackage:       string
    expiryDate:       string
    lotNumber:        string
    lotOptional:      string
    multiPkgNote:     string
    morePkgLater:     string
    lowStockDays:     string
    lowStockHint:     string
    back:             string
    next:             string
    save:             string
    noExpiryError:    string
    savedSuccess:     string
    saveError:        string
  }

  // ── Edit Medication Dialog ────────────────────────────────────────────
  editMedDialog: {
    title:            string
    tabDrug:          string
    tabInventory:     string
    tabSchedule:      string
    drugName:         string
    drugNamePlaceholder: string
    brandName:        string
    brandNamePlaceholder: string
    doseStrength:     string
    doseStrengthPlaceholder: string
    doseStrengthHint: string
    categoryTags:     string
    tagPlaceholder:   string
    quickAdd:         string
    unitType:         string
    containerCalc:    string
    perContainer:     string
    numContainers:    string
    totalUnits:       string
    equivalentContainers: string
    orEnterTotal:     string
    inStock:          string
    lowStockDays:     string
    lowStockUnits:    string
    notes:            string
    notesPlaceholder: string
    packages:         string
    noPackages:       string
    expLabel:         string
    lotLabel:         string
    addPackage:       string
    addPackageTitle:  string
    qty:              string
    expiryDate:       string
    lotOptional:      string
    adding:           string
    frequency:        string
    onceDailyLabel:   string
    twiceDailyLabel:  string
    threeTimesLabel:  string
    fourTimesLabel:   string
    weeklyLabel:      string
    asNeededLabel:    string
    customLabel:      string
    timesOfDay:       string
    daysOfWeek:       string
    mon: string; tue: string; wed: string; thu: string
    fri: string; sat: string; sun: string
    perDose:          string
    perDoseHint:      string
    halfDoseNote:     string
    cancel:           string
    saveChanges:      string
    packageAdded:     string
    packageAddFailed: string
    updateError:      string
    updateSuccess:    string
  }

  // ── Medication Category Tags ──────────────────────────────────────────
  tagLabels: {
    "Blood Pressure":       string
    "Cardiac":              string
    "Diabetes":             string
    "Pain Relief":          string
    "Antibiotic":           string
    "Anti-inflammatory":    string
    "Cholesterol":          string
    "Thyroid":              string
    "Asthma":               string
    "Anticoagulant":        string
    "Antidepressant":       string
    "Anxiety":              string
    "Epilepsy":             string
    "Osteoporosis":         string
    "Vitamin / Supplement": string
    "Allergy":              string
    "Gastric / Acid Reflux": string
    "Sleep":                string
    "Blood Thinner":              string
    "Immunosuppressant":          string
    "Airway Opener":              string
    "Lung Scarring":              string
    "Water Pill":                 string
    "Blood Pressure Lowerer":     string
    "Chest Pain Preventer":       string
    "Kidney Protector":           string
    "Blood Sugar Controller":     string
    "Insulin Helper":             string
    "Inhaled Swelling Reducer":   string
  }

  // ── Units & Frequency ─────────────────────────────────────────────────
  units: {
    pill:        string
    pills:       string
    tablet:      string
    tablets:     string
    inhalation:  string
    inhalations: string
    ml:          string
    drop:        string
    drops:       string
    patch:       string
    patches:     string
    injection:   string
    injections:  string
    unit:        string
    unitsPlural: string
    perDay:      string
    perDose:     string
    total:       string
    inStock:     string
    lowStockAlert: string
    perPackage:  string
    container:   string
    inhaler:     string
    bottle:      string
    vial:        string
    box:         string
  }

  frequency: {
    onceDaily:        string
    twiceDaily:       string
    threeTimesDaily:  string
    fourTimesDaily:   string
    timesDaily:       string  // e.g. "5× daily"
  }
}

