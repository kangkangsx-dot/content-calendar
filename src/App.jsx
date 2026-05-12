ALTER TABLE records ADD COLUMN IF NOT EXISTS content_forms text[] DEFAULT '{}';import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, Plus, Trash2 } from "lucide-react";
import { supabase } from "./supabase";

const STORAGE_KEY = "media-calendar-records-stable-v1";
const WIDTH_KEY = "media-calendar-column-widths-stable-v1";
const ROW_HEIGHT_KEY = "media-calendar-row-heights-stable-v1";
const WEEK_HEIGHT_KEY = "media-calendar-week-heights-stable-v1";
const TABLE_HEIGHT_KEY = "media-calendar-table-height-stable-v1";
const TABLE_SCALE_KEY = "media-calendar-table-scale-stable-v1";
const DELETED_OPTIONS_KEY = "media-calendar-deleted-options-stable-v1";

const defaultRecords = [
  {
    id: 1,
    publishDate: "2026-05-12",
    ip: "小度有技术",
    topic: "闺蜜机技术解读",
    platforms: ["小红书"],
    contentForms: ["小红书"],
    accounts: ["小度官方"],
    accountTypes: ["品牌号"],
    owners: ["康文嘉"],
    contentLink: "",
    publishLink: "",
    isEditing: false,
  },
  {
    id: 2,
    publishDate: "2026-05-12",
    ip: "大咖用小度",
    topic: "达人种草视频混剪",
    platforms: ["抖音"],
    contentForms: ["抖音"],
    accounts: ["小度生活家"],
    accountTypes: ["种草号"],
    owners: ["康文嘉"],
    contentLink: "",
    publishLink: "",
    isEditing: false,
  },
];

const holidayHotspots = {
  "2026-01-01": ["元旦"],
  "2026-02-14": ["情人节"],
  "2026-03-08": ["妇女节"],
  "2026-04-05": ["清明节"],
  "2026-05-01": ["劳动节"],
  "2026-05-04": ["青年节"],
  "2026-05-10": ["母亲节", "礼物推荐"],
  "2026-05-12": ["护士节", "防灾减灾日"],
  "2026-05-14": ["国际家庭日预热", "520倒计时"],
  "2026-05-15": ["国际家庭日", "520预热"],
  "2026-05-20": ["520", "情侣营销"],
  "2026-05-21": ["小满", "夏日上新"],
  "2026-06-01": ["儿童节", "亲子内容"],
  "2026-06-18": ["618大促", "爆品推荐"],
  "2026-09-10": ["教师节", "感恩内容"],
  "2026-10-01": ["国庆节", "黄金周"],
  "2026-11-11": ["双11", "大促节点"],
  "2026-12-25": ["圣诞节", "礼物清单"],
};

const columns = [
  ["index", "#"],
  ["publishDate", "发布日期"],
  ["ip", "IP"],
  ["topic", "内容主题"],
  ["platforms", "发布平台"],
  ["contentForms", "内容形式"],
  ["accounts", "发布账号"],
  ["accountTypes", "账号类型"],
  ["owners", "负责人"],
  ["contentLink", "内容链接"],
  ["publishLink", "发布链接"],
  ["action", ""],
];

const defaultColumnWidths = {
  index: 56,
  publishDate: 150,
  ip: 190,
  topic: 310,
  platforms: 190,
  contentForms: 190,
  accounts: 190,
  accountTypes: 190,
  owners: 190,
  contentLink: 180,
  publishLink: 180,
  action: 70,
};

const colorPalette = [
  "#5B8FF9",
  "#61DDAA",
  "#65789B",
  "#F6BD16",
  "#7262FD",
  "#78D3F8",
  "#9661BC",
  "#F6903D",
  "#008685",
  "#F08BB4",
  "#34C759",
  "#007AFF",
];

const platformIconMap = {
  小红书: { short: "红", bg: "#ffeff3", color: "#ff2442" },
  抖音: { short: "抖", bg: "#eef6ff", color: "#111827" },
  微信: { short: "微", bg: "#ecfdf3", color: "#16a34a" },
  公众号: { short: "公", bg: "#ecfdf3", color: "#16a34a" },
  快手: { short: "快", bg: "#fff7ed", color: "#f97316" },
  视频号: { short: "视", bg: "#eff6ff", color: "#2563eb" },
  B站: { short: "B", bg: "#f0f9ff", color: "#0284c7" },
  微博: { short: "博", bg: "#fff1f2", color: "#e11d48" },
};

function clean(value) {
  return String(value || "").trim();
}

function unique(values) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function splitMulti(value) {
  return String(value || "")
    .split(/[，,、/\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value) {
  return value ? value.replaceAll("-", "/") : "";
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthTitle(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function weekTitle(startDate) {
  const end = new Date(startDate);
  end.setDate(startDate.getDate() + 6);
  const sameMonth = startDate.getMonth() === end.getMonth();
  const startStr = `${startDate.getMonth() + 1}月${startDate.getDate()}日`;
  const endStr = sameMonth ? `${end.getDate()}日` : `${end.getMonth() + 1}月${end.getDate()}日`;
  return `${startDate.getFullYear()}年 ${startStr} - ${endStr}`;
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonthDates(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - startOffset);
  const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const endOffset = 6 - ((lastDay.getDay() + 6) % 7);
  const totalDays = startOffset + lastDay.getDate() + endOffset;
  return Array.from({ length: totalDays }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}

function getWeekDates(viewDate) {
  const startOffset = (viewDate.getDay() + 6) % 7;
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - startOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}

function stableIndex(text) {
  const value = clean(text) || "默认";
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 10007;
  }
  return hash;
}

function tagColor(text) {
  return colorPalette[stableIndex(text) % colorPalette.length];
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function tagStyle(text, deep = false) {
  const color = tagColor(text);
  return {
    color,
    background: hexToRgba(color, deep ? 0.22 : 0.12),
    borderColor: hexToRgba(color, deep ? 0.36 : 0.22),
  };
}

function loadJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function loadNumber(key, fallback) {
  const saved = Number(localStorage.getItem(key));
  return Number.isFinite(saved) && saved > 0 ? saved : fallback;
}

function normalizeRecord(item) {
  return {
    id: item.id || Date.now() + Math.random(),
    publishDate: item.publishDate || "",
    ip: item.ip || "",
    topic: item.topic || "",
    platforms: Array.isArray(item.platforms) ? item.platforms : [],
    contentForms: Array.isArray(item.contentForms) ? item.contentForms : [],
    accounts: Array.isArray(item.accounts) ? item.accounts : [],
    accountTypes: Array.isArray(item.accountTypes) ? item.accountTypes : [],
    owners: Array.isArray(item.owners) ? item.owners : [],
    contentLink: item.contentLink || "",
    publishLink: item.publishLink || "",
    isEditing: Boolean(item.isEditing),
  };
}

function loadRecords() {
  const saved = loadJson(STORAGE_KEY, null);
  if (!Array.isArray(saved)) return defaultRecords;
  return saved.map(normalizeRecord);
}

function createRecord() {
  return {
    id: Date.now() + Math.random(),
    publishDate: "2026-05-12",
    ip: "",
    topic: "",
    platforms: [],
    contentForms: [],
    accounts: [],
    accountTypes: [],
    owners: [],
    contentLink: "",
    publishLink: "",
    isEditing: true,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const chars = String(text || "").split("");
  const lines = [];
  let current = "";
  for (const char of chars) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

export default function App() {
  const [records, setRecords] = useState(loadRecords);
  const [collapsed, setCollapsed] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(2026, 4, 1));
  const [calendarView, setCalendarView] = useState("month"); // "month" | "week"
  const [columnWidths, setColumnWidths] = useState(() => ({ ...defaultColumnWidths, ...loadJson(WIDTH_KEY, {}) }));
  const [rowHeights, setRowHeights] = useState(() => loadJson(ROW_HEIGHT_KEY, {}));
  const [weekHeights, setWeekHeights] = useState(() => ({ 0: 178, 1: 178, 2: 178, 3: 178, 4: 178, 5: 178, ...loadJson(WEEK_HEIGHT_KEY, {}) }));
  const [tableHeight, setTableHeight] = useState(() => loadNumber(TABLE_HEIGHT_KEY, 330));
  const [tableScale, setTableScale] = useState(() => loadNumber(TABLE_SCALE_KEY, 1));
  const [filters, setFilters] = useState({
    publishDate: "",
    ip: "",
    topic: "",
    platforms: "",
    contentForms: "",
    accounts: "",
    accountTypes: "",
    owners: "",
    contentLink: "",
    publishLink: "",
  });
  const [deletedOptions, setDeletedOptions] = useState(() => ({
    ip: [],
    platforms: [],
    contentForms: [],
    accounts: [],
    accountTypes: [],
    owners: [],
    ...loadJson(DELETED_OPTIONS_KEY, {}),
  }));
  const [supabaseReady, setSupabaseReady] = useState(false);

  // 从 Supabase 加载数据
  useEffect(() => {
    async function loadFromSupabase() {
      const { data, error } = await supabase
        .from("records")
        .select("*")
        .order("publish_date", { ascending: true });
      if (error) {
        console.warn("Supabase 加载失败，使用本地数据:", error.message);
        setSupabaseReady(true);
        return;
      }
      if (data && data.length > 0) {
        const mapped = data.map((r) =>
          normalizeRecord({
            id: r.id,
            publishDate: r.publish_date,
            ip: r.ip,
            topic: r.topic,
            platforms: r.platforms || [],
            contentForms: r.content_forms || [],
            accounts: r.accounts || [],
            accountTypes: r.account_types || [],
            owners: r.owners || [],
            contentLink: r.content_link,
            publishLink: r.publish_link,
            isEditing: false,
          })
        );
        setRecords(mapped);
      }
      setSupabaseReady(true);
    }
    loadFromSupabase();

    // 实时订阅其他用户的数据变更
    const channel = supabase
      .channel('records-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        if (eventType === 'INSERT' && newRecord) {
          setRecords(current => {
            // 检查是否已存在
            if (current.some(r => r.id === newRecord.id)) return current;
            const mapped = normalizeRecord({
              id: newRecord.id,
              publishDate: newRecord.publish_date,
              ip: newRecord.ip,
              topic: newRecord.topic,
              platforms: newRecord.platforms || [],
              contentForms: newRecord.content_forms || [],
              accounts: newRecord.accounts || [],
              accountTypes: newRecord.account_types || [],
              owners: newRecord.owners || [],
              contentLink: newRecord.content_link,
              publishLink: newRecord.publish_link,
              isEditing: false,
            });
            return [...current, mapped].sort((a, b) => {
              const dateCompare = (a.publishDate || '').localeCompare(b.publishDate || '');
              if (dateCompare !== 0) return dateCompare;
              return String(a.id).localeCompare(String(b.id));
            });
          });
        } else if (eventType === 'UPDATE' && newRecord) {
          setRecords(current =>
            current.map(r => r.id === newRecord.id
              ? {
                  ...r,
                  publishDate: newRecord.publish_date,
                  ip: newRecord.ip,
                  topic: newRecord.topic,
                  platforms: newRecord.platforms || [],
                  contentForms: newRecord.content_forms || [],
                  accounts: newRecord.accounts || [],
                  accountTypes: newRecord.account_types || [],
                  owners: newRecord.owners || [],
                  contentLink: newRecord.content_link,
                  publishLink: newRecord.publish_link,
                }
              : r
            )
          );
        } else if (eventType === 'DELETE' && oldRecord) {
          setRecords(current => current.filter(r => r.id !== oldRecord.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 保存到 localStorage（本地备份）
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem(WIDTH_KEY, JSON.stringify(columnWidths)), [columnWidths]);
  useEffect(() => localStorage.setItem(ROW_HEIGHT_KEY, JSON.stringify(rowHeights)), [rowHeights]);
  useEffect(() => localStorage.setItem(WEEK_HEIGHT_KEY, JSON.stringify(weekHeights)), [weekHeights]);
  useEffect(() => localStorage.setItem(TABLE_HEIGHT_KEY, String(tableHeight)), [tableHeight]);
  useEffect(() => localStorage.setItem(TABLE_SCALE_KEY, String(tableScale)), [tableScale]);
  useEffect(() => localStorage.setItem(DELETED_OPTIONS_KEY, JSON.stringify(deletedOptions)), [deletedOptions]);

  // 同步到 Supabase（防抖 2 秒）
  const isInitialSyncRef = useRef(true);
  const prevRecordsRef = useRef([]);
  const supabaseSyncRef = useRef(null);
  useEffect(() => {
    if (!supabaseReady) return;
    
    // 避免初始化加载时触发保存（React StrictMode 安全）
    if (isInitialSyncRef.current) {
      isInitialSyncRef.current = false;
      prevRecordsRef.current = records;
      return;
    }
    
    // 避免同一引用重复触发
    if (prevRecordsRef.current === records) return;
    prevRecordsRef.current = records;

    if (supabaseSyncRef.current) {
      clearTimeout(supabaseSyncRef.current);
    }

    supabaseSyncRef.current = setTimeout(async () => {
      // 获取 Supabase 中现有的所有记录
      const { data: existing, error: fetchError } = await supabase.from("records").select("*");
      if (fetchError) {
        console.warn("Supabase 获取失败:", fetchError.message);
        return;
      }

      const existingMap = new Map((existing || []).map(r => [r.id, r]));
      const localIds = new Set(records.map(r => r.id));

      // 找出需要删除的记录（本地不存在的）
      const toDelete = (existing || []).filter(r => !localIds.has(r.id));
      for (const r of toDelete) {
        await supabase.from("records").delete().eq("id", r.id);
      }

      // 找出需要新增的记录（本地有，远程没有）
      const remoteIds = new Set((existing || []).map(r => r.id));
      const toInsert = records.filter(r => !remoteIds.has(r.id));

      // Upsert 所有本地记录（更新已存在的）
      const toUpsert = records.map(r => ({
        id: r.id,
        publish_date: r.publishDate,
        ip: r.ip,
        topic: r.topic,
        platforms: r.platforms,
        content_forms: r.contentForms,
        accounts: r.accounts,
        account_types: r.accountTypes,
        owners: r.owners,
        content_link: r.contentLink,
        publish_link: r.publishLink,
        is_editing: r.isEditing,
      }));

      const { error: upsertError } = await supabase.from("records").upsert(toUpsert, { onConflict: "id" });
      if (upsertError) {
        console.warn("Supabase 保存失败:", upsertError.message);
      }
    }, 2000);
    
    return () => {
      if (supabaseSyncRef.current) {
        clearTimeout(supabaseSyncRef.current);
      }
    };
  }, [records, supabaseReady]);

  const dates = useMemo(() => calendarView === "week" ? getWeekDates(viewMonth) : getMonthDates(viewMonth), [viewMonth, calendarView]);
  const tableWidth = useMemo(
    () => columns.reduce((sum, [key]) => sum + Number(columnWidths[key] || 0) * tableScale, 0),
    [columnWidths, tableScale]
  );

  const options = useMemo(() => {
    const filterDeleted = (key, values) => values.filter((item) => !(deletedOptions[key] || []).includes(item));
    return {
      publishDate: unique(records.map((r) => formatDate(r.publishDate))),
      ip: filterDeleted("ip", unique(records.map((r) => r.ip))),
      topic: unique(records.map((r) => r.topic)),
      platforms: filterDeleted("platforms", unique(records.flatMap((r) => r.platforms))),
      contentForms: filterDeleted("contentForms", unique(records.flatMap((r) => r.contentForms))),
      accounts: filterDeleted("accounts", unique(records.flatMap((r) => r.accounts))),
      accountTypes: filterDeleted("accountTypes", unique(records.flatMap((r) => r.accountTypes))),
      owners: filterDeleted("owners", unique(records.flatMap((r) => r.owners))),
      contentLink: unique(records.map((r) => r.contentLink)),
      publishLink: unique(records.map((r) => r.publishLink)),
    };
  }, [records, deletedOptions]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      return (
        (!filters.publishDate || formatDate(record.publishDate) === filters.publishDate) &&
        (!filters.ip || record.ip === filters.ip) &&
        (!filters.topic || record.topic === filters.topic) &&
        (!filters.platforms || record.platforms.includes(filters.platforms)) &&
        (!filters.contentForms || record.contentForms.includes(filters.contentForms)) &&
        (!filters.accounts || record.accounts.includes(filters.accounts)) &&
        (!filters.accountTypes || record.accountTypes.includes(filters.accountTypes)) &&
        (!filters.owners || record.owners.includes(filters.owners)) &&
        (!filters.contentLink || record.contentLink === filters.contentLink) &&
        (!filters.publishLink || record.publishLink === filters.publishLink)
      );
    });
  }, [records, filters]);

  const sortedFilteredRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const dateA = a.publishDate || "9999-99-99";
      const dateB = b.publishDate || "9999-99-99";
      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) return dateCompare;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [filteredRecords]);

  function addRecord() {
    setRecords((current) => [...current, createRecord()]);
    setCollapsed(false);
  }

  function updateRecord(id, key, value) {
    const nextValue = clean(value);
    if (key === "ip") {
      setDeletedOptions((current) => ({
        ...current,
        ip: (current.ip || []).filter((item) => item !== nextValue),
      }));
    }
    setRecords((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function updateArray(id, key, values) {
    const nextValues = unique(values);
    setDeletedOptions((current) => ({
      ...current,
      [key]: (current[key] || []).filter((item) => !nextValues.includes(item)),
    }));
    setRecords((current) => current.map((item) => (item.id === id ? { ...item, [key]: nextValues } : item)));
  }

  function deleteOption(key, value) {
    const cleanValue = clean(value);
    if (!cleanValue) return;
    setDeletedOptions((current) => ({
      ...current,
      [key]: unique([...(current[key] || []), cleanValue]),
    }));
  }

  function deleteSingleValue(id, key) {
    setRecords((current) => current.map((item) => (item.id === id ? { ...item, [key]: "" } : item)));
  }

  function deleteArrayValue(id, key, value) {
    setRecords((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [key]: (item[key] || []).filter((entry) => entry !== value) } : item
      )
    );
  }

  function finishEdit(id) {
    setRecords((current) => current.map((item) => (item.id === id ? { ...item, isEditing: false } : item)));
  }

  function editRecord(id) {
    setRecords((current) => current.map((item) => (item.id === id ? { ...item, isEditing: true } : item)));
  }

  function deleteRecord(id) {
    setRecords((current) => current.filter((item) => item.id !== id));
  }

  function clearFilters() {
    setFilters({ publishDate: "", ip: "", topic: "", platforms: "", contentForms: "", accounts: "", accountTypes: "", owners: "", contentLink: "", publishLink: "" });
  }

  function getFilterCount(key, value) {
    return records.filter((record) => {
      if (key === "publishDate") return formatDate(record.publishDate) === value;
      if (key === "platforms") return record.platforms.includes(value);
      if (key === "contentForms") return record.contentForms.includes(value);
      if (key === "accounts") return record.accounts.includes(value);
      if (key === "accountTypes") return record.accountTypes.includes(value);
      if (key === "owners") return record.owners.includes(value);
      return record[key] === value;
    }).length;
  }

  function changeTableScale(delta) {
    setTableScale((current) => Math.min(1.35, Math.max(0.8, Number((current + delta).toFixed(2)))));
  }

  function resizeColumn(event, key) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnWidths[key];
    function move(moveEvent) {
      setColumnWidths((current) => ({ ...current, [key]: Math.max(70, startWidth + moveEvent.clientX - startX) }));
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function resizeRow(event, id) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = rowHeights[id] || 54;
    function move(moveEvent) {
      setRowHeights((current) => ({ ...current, [id]: Math.max(44, startHeight + moveEvent.clientY - startY) }));
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function resizeWeek(event, weekIndex) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = weekHeights[weekIndex] || 178;
    function move(moveEvent) {
      setWeekHeights((current) => ({ ...current, [weekIndex]: Math.max(120, startHeight + moveEvent.clientY - startY) }));
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function resizeTable(event) {
    event.preventDefault();
    const startY = event.clientY;
    const tableNode = event.currentTarget.closest(".table-size-shell");
    const startHeight = tableHeight || (tableNode ? tableNode.getBoundingClientRect().height : 360);
    function move(moveEvent) {
      setTableHeight(Math.max(220, startHeight + moveEvent.clientY - startY));
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function exportExcel() {
    const headers = ["发布日期", "IP", "内容主题", "发布平台", "内容形式", "发布账号", "账号类型", "负责人", "内容链接", "发布链接"];
    const rows = sortedFilteredRecords.map((record) => [
      formatDate(record.publishDate),
      record.ip,
      record.topic,
      record.platforms.join("、"),
      record.contentForms.join("、"),
      record.accounts.join("、"),
      record.accountTypes.join("、"),
      record.owners.join("、"),
      record.contentLink,
      record.publishLink,
    ]);
    const html = `
      <html><head><meta charset="UTF-8" /><style>
        table{border-collapse:collapse;font-family:Arial,'Microsoft YaHei',sans-serif;}
        th,td{border:1px solid #d9d9d9;padding:8px 12px;text-align:center;white-space:nowrap;}
        th{background:#f3f4f6;font-weight:700;}
      </style></head><body><table>
        <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></body></html>`;
    downloadBlob(`内容排期表-${monthTitle(viewMonth)}.xls`, "\ufeff" + html, "application/vnd.ms-excel;charset=utf-8");
  }

  function exportCalendar() {
    const isWeekView = calendarView === "week";
    const width = 1800;
    const padding = 44;
    const headerHeight = 80;
    const weekdayHeight = 52;
    const gridTop = padding + headerHeight + weekdayHeight;
    const cellW = (width - padding * 2) / 7;
    const scale = 2;

    let weekHeightsForExport;
    let canvasHeight;
    if (isWeekView) {
      const weekHeight = Number(weekHeights[0] || 320);
      weekHeightsForExport = [weekHeight];
      canvasHeight = Math.max(700, gridTop + weekHeight + padding);
    } else {
      const rowCount = Math.ceil(dates.length / 7);
      weekHeightsForExport = Array.from({ length: rowCount }, (_, i) => Number(weekHeights[i] || 178));
      const dynamicGridHeight = weekHeightsForExport.reduce((sum, h) => sum + h, 0);
      canvasHeight = Math.max(900, gridTop + dynamicGridHeight + padding);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = canvasHeight * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, canvasHeight);
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 24, 24, width - 48, canvasHeight - 48, 28);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.font = "700 34px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
    const titleText = isWeekView ? weekTitle(dates[0] || viewMonth) : monthTitle(viewMonth);
    ctx.fillText(titleText, padding, padding + 46);

    const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    ctx.font = "600 18px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
    ctx.fillStyle = "#667085";
    weekdays.forEach((day, index) => ctx.fillText(day, padding + index * cellW + 18, padding + headerHeight + 34));

    dates.forEach((date, index) => {
      const col = index % 7;
      const row = Math.floor(index / 7);
      const x = padding + col * cellW;
      const y = gridTop + weekHeightsForExport.slice(0, row).reduce((sum, value) => sum + value, 0);
      const cellH = weekHeightsForExport[row] || (isWeekView ? 320 : 178);
      const iso = toISODate(date);
      const dayRecords = sortedFilteredRecords.filter((r) => r.publishDate === iso && !r.isEditing);
      const dayHotspots = holidayHotspots[iso] || [];
      const outside = !isWeekView && !isSameMonth(date, viewMonth);
      ctx.fillStyle = outside ? "#f8fafc" : "#ffffff";
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = "#e5e7eb";
      ctx.strokeRect(x, y, cellW, cellH);
      ctx.fillStyle = "#111827";
      ctx.font = "700 18px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${date.getDate()}日`, x + cellW - 12, y + 26);
      ctx.textAlign = "left";

      let cursorY = y + 44;
      dayHotspots.forEach((item) => {
        ctx.fillStyle = "#eef2ff";
        roundedRect(ctx, x + 10, cursorY, Math.min(cellW - 20, 150), 24, 12);
        ctx.fill();
        ctx.fillStyle = "#6272d9";
        ctx.font = "500 13px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
        ctx.fillText(`✨ ${item}`, x + 20, cursorY + 16);
        cursorY += 28;
      });

      dayRecords.slice(0, isWeekView ? 6 : 3).forEach((record) => {
        const color = tagColor(record.ip || "默认");
        const cardX = x + 10;
        const cardY = cursorY + 4;
        const cardW = cellW - 20;
        const cardH = 106;

        // 卡片背景 + 边框
        ctx.fillStyle = hexToRgba(color, 0.12);
        ctx.strokeStyle = hexToRgba(color, 0.26);
        ctx.lineWidth = 1;
        roundedRect(ctx, cardX, cardY, cardW, cardH, 16);
        ctx.fill();
        ctx.stroke();

        // ---- IP pill ----
        // CSS: padding: 7px 8px 8px -> top=7
        //      .calendar-ip-pill: padding:0 8px; min-height:22px; border-radius:999px; border:1px solid; line-height:22px
        const ipText = record.ip || "未填写IP";
        const ipColor = tagColor(ipText);
        const ipBg = hexToRgba(ipColor, 0.18);
        const ipH = 22;
        const ipPaddingH = 8;
        ctx.font = "650 11px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
        const ipTextW = ctx.measureText(ipText).width;
        const ipPillW = ipTextW + ipPaddingH * 2;
        const ipPillX = cardX + cardW - 8 - ipPillW;
        const ipPillY = cardY + 7;
        ctx.fillStyle = ipBg;
        roundedRect(ctx, ipPillX, ipPillY, ipPillW, ipH, 12);
        ctx.fill();
        ctx.fillStyle = ipColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ipText, ipPillX + ipPillW / 2, ipPillY + ipH / 2);

        // ---- Topic ----
        // CSS: gap:5px; .calendar-topic: font-size:12px; font-weight:650; line-height:1.25
        const topicY = ipPillY + ipH + 5;
        ctx.fillStyle = "#1f2937";
        ctx.font = "650 12px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "alphabetic";
        const topicLines = wrapText(ctx, record.topic || "未填写主题", cardW - 28, 2);
        topicLines.forEach((line, i) => {
          ctx.fillText(line, cardX + cardW - 8, topicY + 14 + i * 15);
        });

        // ---- Platform row ----
        // CSS: gap:5px; .calendar-platform-row: display:flex; justify-content:flex-end; align-items:center; gap:4px;
        //      .platform-icon: min-width:23px; height:23px; padding:0 6px; border-radius:999px; border:1px solid rgba(148,163,184,.22); font-size:11px; font-weight:700;
        const platformRowY = topicY + 14 + (topicLines.length - 1) * 15 + 5;
        const platforms = record.platforms;
        if (platforms.length) {
          let px = cardX + cardW - 8;
          const py = platformRowY;
          const iconH = 23;
          platforms.slice().reverse().forEach((platform) => {
            const config = platformIconMap[platform] || { short: platform.slice(0, 1), bg: "#f8fafc", color: "#475467" };
            ctx.font = "700 11px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
            const textW = ctx.measureText(config.short).width;
            const iconW = Math.max(23, textW + 12);
            const iconX = px - iconW;
            ctx.fillStyle = config.bg;
            roundedRect(ctx, iconX, py, iconW, iconH, 12);
            ctx.fill();
            ctx.strokeStyle = "rgba(148,163,184,0.22)";
            ctx.lineWidth = 1;
            roundedRect(ctx, iconX, py, iconW, iconH, 12);
            ctx.stroke();
            ctx.fillStyle = config.color;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(config.short, iconX + iconW / 2, py + iconH / 2);
            px = iconX - 4;
          });
        } else {
          ctx.fillStyle = "#475467";
          ctx.font = "500 11px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "alphabetic";
          ctx.fillText("未填写", cardX + cardW - 8, platformRowY + 17);
        }

        // ---- Account type row ----
        // CSS: gap:5px; .calendar-account-type-row: display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:4px;
        //      .account-type-pill: min-height:21px; padding:0 7px; border-radius:999px; border:1px solid; font-size:10.5px; font-weight:600;
        const accRowY = platformRowY + 23 + 5;
        const accountTypes = record.accountTypes;
        if (accountTypes.length) {
          let px = cardX + cardW - 8;
          const py = accRowY;
          const pillH = 21;
          accountTypes.slice().reverse().forEach((type) => {
            const style = tagStyle(type);
            ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
            const textW = ctx.measureText(type).width;
            const pillW = textW + 14;
            const pillX = px - pillW;
            ctx.fillStyle = style.background;
            roundedRect(ctx, pillX, py, pillW, pillH, 11);
            ctx.fill();
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = 1;
            roundedRect(ctx, pillX, py, pillW, pillH, 11);
            ctx.stroke();
            ctx.fillStyle = style.color;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(type, pillX + pillW / 2, py + pillH / 2);
            px = pillX - 4;
          });
        } else {
          ctx.fillStyle = "#475467";
          ctx.font = "500 11px -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "alphabetic";
          ctx.fillText("未填写类型", cardX + cardW - 8, accRowY + 17);
        }

        // Reset text align
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        cursorY += cardH + 10;
      });
    });

    const link = document.createElement("a");
    link.download = `内容排期日历-${isWeekView ? weekTitle(dates[0] || viewMonth) : monthTitle(viewMonth)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="page-shell">
      <div className="content-wrap">
        <section className="ios-card">
          <div className="table-toolbar">
            <button type="button" className="collapse-button" onClick={() => setCollapsed((value) => !value)}>
              {collapsed ? <ChevronDown className="toolbar-icon" /> : <ChevronUp className="toolbar-icon" />}
              <span>内容排期 {sortedFilteredRecords.length} 条</span>
            </button>
            <div className="toolbar-actions">
              <button type="button" className="secondary-button" onClick={() => changeTableScale(-0.05)}>缩小</button>
              <span className="scale-indicator">{Math.round(tableScale * 100)}%</span>
              <button type="button" className="secondary-button" onClick={() => changeTableScale(0.05)}>放大</button>
              <button type="button" className="secondary-button" onClick={clearFilters}>清空筛选</button>
              <button type="button" className="secondary-button" onClick={exportExcel}>导出Excel</button>
              <button type="button" className="primary-button" onClick={addRecord}><Plus className="plus-icon" />添加记录</button>
            </div>
          </div>

          {!collapsed && (
            <div
              className="table-size-shell"
              style={{
                height: `${tableHeight}px`,
                "--table-scale": tableScale,
              }}
            >
              <div className="table-scroll">
                <table className="schedule-table" style={{ width: `${tableWidth}px` }}>
                  <colgroup>{columns.map(([key]) => <col key={key} style={{ width: `${Number(columnWidths[key] || 0) * tableScale}px` }} />)}</colgroup>
                  <thead>
                    <tr>{columns.map(([key, label]) => <th key={key}>{label}<span className="resize-handle" onMouseDown={(event) => resizeColumn(event, key)} /></th>)}</tr>
                    <tr className="filter-row">
                      <th />
                      <th><FilterSelect value={filters.publishDate} options={options.publishDate} placeholder="全部日期" getCount={(value) => getFilterCount("publishDate", value)} onChange={(value) => setFilters((f) => ({ ...f, publishDate: value }))} /></th>
                      <th><FilterSelect value={filters.ip} options={options.ip} placeholder="全部IP" getCount={(value) => getFilterCount("ip", value)} onChange={(value) => setFilters((f) => ({ ...f, ip: value }))} /></th>
                      <th><FilterSelect value={filters.topic} options={options.topic} placeholder="全部主题" getCount={(value) => getFilterCount("topic", value)} onChange={(value) => setFilters((f) => ({ ...f, topic: value }))} /></th>
                      <th><FilterSelect value={filters.platforms} options={options.platforms} placeholder="全部平台" getCount={(value) => getFilterCount("platforms", value)} onChange={(value) => setFilters((f) => ({ ...f, platforms: value }))} /></th>
                      <th><FilterSelect value={filters.contentForms} options={options.contentForms} placeholder="全部形式" getCount={(value) => getFilterCount("contentForms", value)} onChange={(value) => setFilters((f) => ({ ...f, contentForms: value }))} /></th>
                      <th><FilterSelect value={filters.accounts} options={options.accounts} placeholder="全部账号" getCount={(value) => getFilterCount("accounts", value)} onChange={(value) => setFilters((f) => ({ ...f, accounts: value }))} /></th>
                      <th><FilterSelect value={filters.accountTypes} options={options.accountTypes} placeholder="全部类型" getCount={(value) => getFilterCount("accountTypes", value)} onChange={(value) => setFilters((f) => ({ ...f, accountTypes: value }))} /></th>
                      <th><FilterSelect value={filters.owners} options={options.owners} placeholder="全部负责人" getCount={(value) => getFilterCount("owners", value)} onChange={(value) => setFilters((f) => ({ ...f, owners: value }))} /></th>
                      <th><FilterSelect value={filters.contentLink} options={options.contentLink} placeholder="全部内容链接" getCount={(value) => getFilterCount("contentLink", value)} onChange={(value) => setFilters((f) => ({ ...f, contentLink: value }))} /></th>
                      <th><FilterSelect value={filters.publishLink} options={options.publishLink} placeholder="全部发布链接" getCount={(value) => getFilterCount("publishLink", value)} onChange={(value) => setFilters((f) => ({ ...f, publishLink: value }))} /></th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilteredRecords.map((record, index) => (
                      <RecordRow
                        key={record.id}
                        index={index}
                        record={record}
                        rowHeight={rowHeights[record.id] || 54}
                        options={options}
                        onUpdate={updateRecord}
                        onUpdateArray={updateArray}
                        onDeleteOption={deleteOption}
                        onDeleteSingleValue={deleteSingleValue}
                        onDeleteArrayValue={deleteArrayValue}
                        onFinish={finishEdit}
                        onEdit={editRecord}
                        onDelete={deleteRecord}
                        onResize={resizeRow}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-resize-handle" onMouseDown={resizeTable}>拖动调整表格视图高度</div>
            </div>
          )}
        </section>

        <section className="ios-card calendar-card">
          <div className="calendar-toolbar">
            <div className="calendar-left">
              <button type="button" className="mini-button" onClick={() => setViewMonth(new Date(2026, 4, 1))}>今天</button>
              <button type="button" className="arrow-button" onClick={() => setViewMonth((d) => calendarView === "week" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7) : new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
              <button type="button" className="arrow-button" onClick={() => setViewMonth((d) => calendarView === "week" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
              <div className="calendar-title">{calendarView === "week" ? weekTitle(dates[0] || viewMonth) : monthTitle(viewMonth)}</div>
            </div>
            <div className="calendar-right">
              <button type="button" className="export-button" onClick={exportCalendar}><Download className="download-icon" /> 导出图片</button>
              <button type="button" className="calendar-view-pill" onClick={() => setCalendarView((v) => v === "month" ? "week" : "month")}>{calendarView === "month" ? "月" : "周"}</button>
            </div>
          </div>

          <div
            className="calendar-grid"
            style={{
              gridTemplateRows: calendarView === "week"
                ? `42px ${weekHeights[0] || 320}px`
                : `42px ${Array.from({ length: Math.ceil(dates.length / 7) }, (_, i) => `${weekHeights[i] || 178}px`).join(" ")}`,
            }}
          >
            {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((day) => <div key={day} className="weekday-cell">{day}</div>)}
            {dates.map((date, index) => {
              const iso = toISODate(date);
              const weekIndex = Math.floor(index / 7);
              const isLast = index % 7 === 6;
              const dayRecords = sortedFilteredRecords.filter((item) => item.publishDate === iso && !item.isEditing);
              const hotspots = holidayHotspots[iso] || [];
              const outside = calendarView === "month" && !isSameMonth(date, viewMonth);
              return (
                <div key={iso} className={`day-cell ${outside ? "outside-month" : ""}`}>
                  <div className="day-number">{date.getDate()}日</div>
                  {hotspots.length > 0 && (
                    <div className={`holiday-grid ${hotspots.some((h) => h.length > 5) ? "single-holiday" : ""}`}>
                      {hotspots.map((item) => <div key={item} className="holiday-tag">✨ {item}</div>)}
                    </div>
                  )}
                  <div className="day-records">
                    {dayRecords.map((record) => <CalendarCard key={record.id} record={record} />)}
                  </div>
                  {calendarView === "month" && isLast && <div className="week-row-resize-handle" onMouseDown={(event) => resizeWeek(event, weekIndex)}>拖动调整本周高度</div>}
                </div>
              );
            })}
          </div>
          {calendarView === "month" && <div className="calendar-resize-note">每周最右侧格子底部可拖动调整该行高度</div>}
        </section>
      </div>

      <datalist id="ip-options">{options.ip.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="platform-options">{options.platforms.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="content-form-options">{options.contentForms.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="account-options">{options.accounts.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="account-type-options">{options.accountTypes.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="owner-options">{options.owners.map((item) => <option key={item} value={item} />)}</datalist>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif; background: radial-gradient(circle at top left, rgba(230,239,255,.9), transparent 28%), linear-gradient(180deg,#f6f8fb 0%,#eef2f7 100%); color: #111827; }
        button, input, select { font-family: inherit; }
        .page-shell { min-height: 100vh; padding: 14px; }
        .content-wrap { max-width: 1840px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        .ios-card { background: rgba(255,255,255,.82); border: 1px solid rgba(255,255,255,.88); border-radius: 22px; box-shadow: 0 16px 46px rgba(15,23,42,.075); backdrop-filter: blur(20px); overflow: hidden; }
        .table-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #e9edf3; background: rgba(255,255,255,.72); }
        .toolbar-actions, .calendar-right { display: flex; align-items: center; gap: 8px; }
        .collapse-button { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 13px; border-radius: 13px; border: 1px solid #dde4ee; background: rgba(255,255,255,.96); color: #364152; font-size: 14px; font-weight: 600; box-shadow: 0 5px 18px rgba(15,23,42,.04); }
        .toolbar-icon, .plus-icon, .download-icon { width: 15px; height: 15px; }
        .primary-button, .secondary-button, .export-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; padding: 0 16px; border-radius: 14px; font-size: 14px; font-weight: 600; transition: .15s ease; }
        .primary-button { border: none; background: linear-gradient(180deg,#1290ff 0%,#007aff 100%); color: white; box-shadow: 0 10px 24px rgba(0,122,255,.2); }
        .primary-button:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(0,122,255,.28); filter: brightness(1.03); }
        .primary-button:active { transform: translateY(0); filter: brightness(.96); }
        .secondary-button, .export-button { border: 1px solid #dde4ee; background: rgba(255,255,255,.95); color: #475467; box-shadow: 0 4px 14px rgba(15,23,42,.035); }
        .secondary-button:hover, .export-button:hover, .collapse-button:hover, .mini-button:hover, .arrow-button:hover, .calendar-view-pill:hover { background: #f8fbff; border-color: #b9d7ff; color: #007aff; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15,23,42,.07); }
        .secondary-button:active, .export-button:active, .collapse-button:active, .mini-button:active, .arrow-button:active, .calendar-view-pill:active { transform: translateY(0); }
        .table-size-shell { position: relative; min-height: 220px; overflow: hidden; --table-scale: 1; }
        .table-scroll { height: calc(100% - 22px); overflow: auto; }
        .schedule-table { border-collapse: collapse; table-layout: fixed; background: transparent; font-size: calc(14px * var(--table-scale)); }
        .schedule-table th { position: relative; height: calc(36px * var(--table-scale)); padding: 0 calc(9px * var(--table-scale)); text-align: center; font-size: calc(12px * var(--table-scale)); font-weight: 600; color: #667085; background: #f8fafc; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
        .schedule-table .filter-row th { height: calc(34px * var(--table-scale)); background: #fbfcfe; padding: calc(4px * var(--table-scale)) calc(7px * var(--table-scale)); }
        .resize-handle { position: absolute; top: 0; right: -3px; width: 7px; height: 100%; cursor: col-resize; z-index: 2; }
        .resize-handle:hover { background: rgba(0,122,255,.18); }
        .filter-select { width: 100%; height: calc(26px * var(--table-scale)); border-radius: calc(9px * var(--table-scale)); border: 1px solid #dde4ee; background: white; padding: 0 calc(7px * var(--table-scale)); color: #475467; outline: none; font-size: calc(11px * var(--table-scale)); text-align: center; }
        .schedule-table td { position: relative; padding: calc(5px * var(--table-scale)) calc(9px * var(--table-scale)); border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; background: rgba(255,255,255,.78); vertical-align: middle; font-size: calc(13px * var(--table-scale)); text-align: center; }
        .row-resize-handle { position: absolute; left: 0; bottom: -3px; width: 100%; height: 7px; cursor: row-resize; z-index: 2; }
        .row-resize-handle:hover { background: rgba(0,122,255,.12); }
        .schedule-table tr:hover td { background: rgba(247,250,255,.95); }
        .display-text { min-height: calc(20px * var(--table-scale)); line-height: calc(20px * var(--table-scale)); color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: calc(13px * var(--table-scale)); }
        .display-topic { font-weight: 500; font-size: calc(13px * var(--table-scale)); }
        .cell-input { width: 100%; height: calc(30px * var(--table-scale)); border-radius: calc(10px * var(--table-scale)); border: 1px solid #d9e0ea; background: white; padding: 0 calc(8px * var(--table-scale)); outline: none; font-size: calc(13px * var(--table-scale)); color: #111827 !important; text-align: center; color-scheme: light; }
        .tag-group { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: calc(5px * var(--table-scale)); min-height: calc(20px * var(--table-scale)); }
        .tag-pill { display: inline-flex; align-items: center; gap: calc(5px * var(--table-scale)); min-height: calc(23px * var(--table-scale)); padding: 0 calc(8px * var(--table-scale)); border-radius: 999px; border: 1px solid; font-size: calc(12px * var(--table-scale)); font-weight: 500; line-height: calc(23px * var(--table-scale)); white-space: nowrap; transition: .15s ease; }
        .tag-pill:hover { transform: translateY(-1px); filter: brightness(1.03); }
        .tag-remove-button { width: calc(16px * var(--table-scale)); height: calc(16px * var(--table-scale)); border: none; border-radius: 999px; background: rgba(255,255,255,.72); color: currentColor; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: calc(13px * var(--table-scale)); line-height: 1; padding: 0; }
        .tag-remove-button:hover { background: rgba(255,255,255,.95); transform: scale(1.08); }
        .option-chip-wrap { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(5px * var(--table-scale)); max-width: 100%; }
        .option-chip { display: inline-flex; align-items: center; gap: calc(5px * var(--table-scale)); height: calc(23px * var(--table-scale)); padding: 0 calc(7px * var(--table-scale)); border-radius: 999px; border: 1px solid #dde4ee; background: #f8fafc; color: #475467; font-size: calc(11px * var(--table-scale)); cursor: pointer; transition: .15s ease; }
        .option-chip:hover { background: #eef5ff; color: #007aff; border-color: #b9d7ff; transform: translateY(-1px); }
        .option-chip-delete { width: calc(15px * var(--table-scale)); height: calc(15px * var(--table-scale)); border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; }
        .option-chip-delete:hover { background: white; color: #ef4444; }
        .delete-button { width: calc(30px * var(--table-scale)); height: calc(30px * var(--table-scale)); border: 1px solid #e5e7eb; background: white; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; color: #667085; transition: .15s ease; }
        .delete-button:hover { color: #ef4444; background: #fff5f5; }
        .delete-icon { width: calc(14px * var(--table-scale)); height: calc(14px * var(--table-scale)); }
        .complete-button { height: calc(30px * var(--table-scale)); padding: 0 calc(11px * var(--table-scale)); border: 1px solid #d9e0ea; background: white; border-radius: 11px; color: #007aff; font-size: 13px; font-weight: 600; transition: .15s ease; }
        .complete-button:hover, .add-chip-button:hover, .mini-save:hover { background: #eef5ff; border-color: #b9d7ff; transform: translateY(-1px); }
        .tag-editor-wrap { display: flex; flex-direction: column; gap: calc(5px * var(--table-scale)); align-items: center; }
        .tag-editor-top { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: calc(5px * var(--table-scale)); }
        .add-chip-button { height: calc(23px * var(--table-scale)); padding: 0 calc(8px * var(--table-scale)); border: 1px dashed #cbd5e1; border-radius: 999px; background: white; color: #64748b; font-size: 12px; font-weight: 500; }
        .mini-editor { display: flex; align-items: center; gap: calc(5px * var(--table-scale)); }
        .mini-input { width: calc(118px * var(--table-scale)); height: calc(27px * var(--table-scale)); border-radius: 9px; border: 1px solid #d9e0ea; background: white; padding: 0 9px; outline: none; font-size: 12px; color: #111827 !important; text-align: center; color-scheme: light; }
        .mini-save { height: calc(27px * var(--table-scale)); padding: 0 calc(8px * var(--table-scale)); border: none; border-radius: 9px; background: #eef5ff; color: #007aff; font-size: 12px; font-weight: 600; }
        .link-cell { color: #007aff; font-weight: 600; text-decoration: none; }
        .link-cell:hover { text-decoration: underline; }
        .empty-link { color: #94a3b8; font-size: calc(12px * var(--table-scale)); }
        .calendar-card { position: relative; padding: 12px 12px 28px; }
        .calendar-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; padding: 3px 4px 8px; }
        .calendar-left { display: flex; align-items: center; gap: 8px; }
        .mini-button, .arrow-button, .calendar-view-pill { height: 34px; border-radius: 11px; border: 1px solid #dde4ee; background: rgba(255,255,255,.95); color: #475467; font-size: 13px; font-weight: 600; box-shadow: 0 4px 14px rgba(15,23,42,.035); }
        .mini-button { padding: 0 13px; }
        .arrow-button { width: 34px; font-size: 19px; line-height: 1; }
        .calendar-view-pill { min-width: 46px; display: inline-flex; align-items: center; justify-content: center; padding: 0 13px; }
        .calendar-title { font-size: 17px; font-weight: 700; color: #111827; margin-left: 5px; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); border-top: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; background: rgba(255,255,255,.62); }
        .weekday-cell { padding: 9px 8px; font-size: 13px; font-weight: 600; color: #667085; background: #f8fafc; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; }
        .day-cell { position: relative; min-height: 120px; overflow: hidden; padding: 8px 8px 16px; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; background: rgba(255,255,255,.76); display: flex; flex-direction: column; gap: 6px; }
        .outside-month { background: rgba(248,250,252,.64); }
        .day-number { font-size: 13px; font-weight: 700; color: #111827; align-self: flex-end; }
        .outside-month .day-number { color: #94a3b8; }
        .holiday-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
        .holiday-grid.single-holiday { grid-template-columns: 1fr; }
        .holiday-tag { display: inline-flex; align-items: center; justify-content: center; min-height: 23px; padding: 0 7px; border-radius: 999px; background: #eef2ff; color: #6272d9; font-size: 10.5px; font-weight: 500; line-height: 1; text-align: center; white-space: nowrap; overflow: visible; }
        .day-records { display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
        .calendar-record-card { border: 1px solid; border-radius: 15px; padding: 7px 8px 8px; display: flex; flex-direction: column; gap: 5px; align-items: flex-end; text-align: right; transition: .15s ease; }
        .calendar-record-card:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(15,23,42,.06); }
        .calendar-ip-pill { display: inline-flex; align-items: center; max-width: 100%; min-height: 22px; padding: 0 8px; border-radius: 999px; border: 1px solid; font-size: 11px; font-weight: 650; line-height: 22px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .calendar-topic { font-size: 12px; font-weight: 650; color: #1f2937; line-height: 1.25; word-break: break-word; }
        .calendar-platform-row, .calendar-account-type-row { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 4px; }
        .calendar-meta-row { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 4px; }
        .platform-icon { display: inline-flex; align-items: center; justify-content: center; min-width: 23px; height: 23px; padding: 0 6px; border-radius: 999px; border: 1px solid rgba(148,163,184,.22); font-size: 11px; font-weight: 700; transition: .15s ease; }
        .platform-icon:hover { transform: translateY(-1px) scale(1.03); }
        .account-type-pill { display: inline-flex; align-items: center; min-height: 21px; padding: 0 7px; border-radius: 999px; border: 1px solid; font-size: 10.5px; font-weight: 600; transition: .15s ease; }
        .account-type-pill:hover { transform: translateY(-1px); }
        .platform-text { font-size: 11px; color: #475467; }
        .scale-indicator { min-width: 48px; text-align: center; color: #667085; font-size: 13px; font-weight: 700; }
        .week-row-resize-handle { position: absolute; left: 0; right: 0; bottom: 0; height: 14px; display: flex; align-items: center; justify-content: center; cursor: row-resize; color: transparent; font-size: 10px; background: transparent; border-top: 1px dashed transparent; }
        .week-row-resize-handle:hover { color: #94a3b8; background: rgba(248,250,252,.75); border-top-color: #cbd5e1; }
        .calendar-resize-note { position: absolute; left: 0; right: 0; bottom: 0; height: 22px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; background: rgba(248,250,252,.7); border-top: 1px solid #e5e7eb; }
        .table-resize-handle { height: 22px; display: flex; align-items: center; justify-content: center; cursor: row-resize; color: #94a3b8; font-size: 11px; background: rgba(248,250,252,.7); border-top: 1px solid #e5e7eb; transition: .15s ease; }
        .table-resize-handle:hover { color: #007aff; background: #eef5ff; }
      `}</style>
    </div>
  );
}

function FilterSelect({ value, options, placeholder, onChange, getCount }) {
  return (
    <select className="filter-select" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((item) => <option key={item} value={item}>{getCount ? `${item}（${getCount(item)}）` : item}</option>)}
    </select>
  );
}

function RecordRow({
  index,
  record,
  rowHeight,
  options,
  onUpdate,
  onUpdateArray,
  onDeleteOption,
  onDeleteSingleValue,
  onDeleteArrayValue,
  onFinish,
  onEdit,
  onDelete,
  onResize,
}) {
  return (
    <tr onDoubleClick={() => !record.isEditing && onEdit(record.id)} style={{ height: `calc(${rowHeight}px * var(--table-scale))` }}>
      <td>{index + 1}<span className="row-resize-handle" onMouseDown={(event) => onResize(event, record.id)} /></td>
      <td>{record.isEditing ? <input type="date" className="cell-input" value={record.publishDate} onChange={(e) => onUpdate(record.id, "publishDate", e.target.value)} /> : <div className="display-text">{formatDate(record.publishDate)}</div>}</td>
      <td>{record.isEditing ? <SingleTagEditor value={record.ip} options={options.ip} listId="ip-options" placeholder="添加IP" onChange={(value) => onUpdate(record.id, "ip", value)} onRemove={() => onDeleteSingleValue(record.id, "ip")} onDeleteOption={(value) => onDeleteOption("ip", value)} /> : <TagGroup values={[record.ip || "未填写"]} />}</td>
      <td>{record.isEditing ? <input className="cell-input" value={record.topic} placeholder="填写内容主题" onChange={(e) => onUpdate(record.id, "topic", e.target.value)} /> : <div className="display-text display-topic">{record.topic || "未填写"}</div>}</td>
      <td>{record.isEditing ? <TagEditor values={record.platforms} options={options.platforms} listId="platform-options" placeholder="添加平台" onChange={(values) => onUpdateArray(record.id, "platforms", values)} onRemoveValue={(value) => onDeleteArrayValue(record.id, "platforms", value)} onDeleteOption={(value) => onDeleteOption("platforms", value)} /> : <TagGroup values={record.platforms.length ? record.platforms : ["未填写"]} />}</td>
      <td>{record.isEditing ? <TagEditor values={record.contentForms} options={options.contentForms} listId="content-form-options" placeholder="添加形式" onChange={(values) => onUpdateArray(record.id, "contentForms", values)} onRemoveValue={(value) => onDeleteArrayValue(record.id, "contentForms", value)} onDeleteOption={(value) => onDeleteOption("contentForms", value)} /> : <TagGroup values={record.contentForms.length ? record.contentForms : ["未填写"]} />}</td>
      <td>{record.isEditing ? <TagEditor values={record.accounts} options={options.accounts} listId="account-options" placeholder="添加账号" onChange={(values) => onUpdateArray(record.id, "accounts", values)} onRemoveValue={(value) => onDeleteArrayValue(record.id, "accounts", value)} onDeleteOption={(value) => onDeleteOption("accounts", value)} /> : <TagGroup values={record.accounts.length ? record.accounts : ["未填写"]} />}</td>
      <td>{record.isEditing ? <TagEditor values={record.accountTypes} options={options.accountTypes} listId="account-type-options" placeholder="添加类型" onChange={(values) => onUpdateArray(record.id, "accountTypes", values)} onRemoveValue={(value) => onDeleteArrayValue(record.id, "accountTypes", value)} onDeleteOption={(value) => onDeleteOption("accountTypes", value)} /> : <TagGroup values={record.accountTypes.length ? record.accountTypes : ["未填写"]} />}</td>
      <td>{record.isEditing ? <TagEditor values={record.owners} options={options.owners} listId="owner-options" placeholder="添加负责人" onChange={(values) => onUpdateArray(record.id, "owners", values)} onRemoveValue={(value) => onDeleteArrayValue(record.id, "owners", value)} onDeleteOption={(value) => onDeleteOption("owners", value)} /> : <TagGroup values={record.owners.length ? record.owners : ["未填写"]} />}</td>
      <td>{record.isEditing ? <input className="cell-input" value={record.contentLink} placeholder="粘贴内容链接" onChange={(e) => onUpdate(record.id, "contentLink", e.target.value)} /> : <LinkCell value={record.contentLink} />}</td>
      <td>{record.isEditing ? <input className="cell-input" value={record.publishLink} placeholder="粘贴发布链接" onChange={(e) => onUpdate(record.id, "publishLink", e.target.value)} /> : <LinkCell value={record.publishLink} />}</td>
      <td>{record.isEditing ? <button type="button" className="complete-button" onClick={() => onFinish(record.id)}>完成</button> : <button type="button" className="delete-button" onClick={() => onDelete(record.id)}><Trash2 className="delete-icon" /></button>}</td>
    </tr>
  );
}

function LinkCell({ value }) {
  const text = clean(value);
  if (!text) return <span className="empty-link">未填写</span>;
  return <a className="link-cell" href={text} target="_blank" rel="noreferrer">打开链接</a>;
}

function TagGroup({ values }) {
  return <div className="tag-group">{values.map((item) => <TagPill key={item} value={item} />)}</div>;
}

function TagPill({ value, removable = false, onRemove }) {
  return (
    <span className="tag-pill" style={tagStyle(value)}>
      <span>{value}</span>
      {removable && (
        <button type="button" className="tag-remove-button" onClick={onRemove} aria-label={`删除${value}`}>
          ×
        </button>
      )}
    </span>
  );
}

function SingleTagEditor({ value, options, listId, placeholder, onChange, onRemove, onDeleteOption }) {
  const currentValue = clean(value);
  return (
    <TagEditor
      values={currentValue ? [currentValue] : []}
      options={options}
      listId={listId}
      placeholder={placeholder}
      single
      onChange={(values) => onChange(values[values.length - 1] || "")}
      onRemoveValue={onRemove}
      onDeleteOption={onDeleteOption}
    />
  );
}

function TagEditor({ values, options = [], listId, placeholder, onChange, onRemoveValue, onDeleteOption, single = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const items = splitMulti(draft);
    if (items.length) onChange(single ? [items[items.length - 1]] : unique([...values, ...items]));
    setDraft("");
    setOpen(false);
  }

  function chooseOption(item) {
    onChange(single ? [item] : unique([...values, item]));
    setOpen(false);
  }

  return (
    <div className="tag-editor-wrap">
      <div className="tag-editor-top">
        {values.map((item) => (
          <TagPill key={item} value={item} removable onRemove={() => onRemoveValue?.(item)} />
        ))}
        <button type="button" className="add-chip-button" onClick={() => setOpen((value) => !value)}>+ 添加</button>
      </div>
      {open && (
        <div className="mini-editor">
          <input list={listId} className="mini-input" value={draft} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }} />
          <button type="button" className="mini-save" onClick={commit}>加入</button>
        </div>
      )}
      {open && options.length > 0 && (
        <div className="option-chip-wrap">
          {options.map((item) => (
            <button key={item} type="button" className="option-chip" onClick={() => chooseOption(item)}>
              <span>{item}</span>
              <span
                className="option-chip-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteOption?.(item);
                }}
              >×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ipPillStyle(text) {
  const color = tagColor(text);
  return {
    color,
    background: hexToRgba(color, 0.18),
    borderColor: "transparent",
  };
}

function CalendarCard({ record }) {
  const color = tagColor(record.ip || "默认");
  return (
    <div className="calendar-record-card" style={{ background: hexToRgba(color, 0.12), borderColor: hexToRgba(color, 0.26) }}>
      <div className="calendar-ip-pill" style={ipPillStyle(record.ip || "未填写IP")}>{record.ip || "未填写IP"}</div>
      <div className="calendar-topic">{record.topic || "未填写主题"}</div>
      <div className="calendar-meta-row">
        {record.platforms.length ? record.platforms.map((platform) => <PlatformBadge key={platform} platform={platform} />) : <span className="platform-text">未填写</span>}
        {record.contentForms.length ? record.contentForms.map((form) => <span key={form} className="account-type-pill" style={tagStyle(form)}>{form}</span>) : <span className="platform-text">未填写形式</span>}
        {record.accountTypes.length ? record.accountTypes.map((type) => <span key={type} className="account-type-pill" style={tagStyle(type)}>{type}</span>) : <span className="platform-text">未填写类型</span>}
      </div>
    </div>
  );
}

function PlatformBadge({ platform }) {
  const config = platformIconMap[platform] || { short: platform.slice(0, 1), bg: "#f8fafc", color: "#475467" };
  return <span className="platform-icon" title={platform} style={{ background: config.bg, color: config.color }}>{config.short}</span>;
}


