export interface ReportColumn {
  id: string;
  title: string;
  children?: ReportColumn[];
}

interface ReportItem {
  statement_column_id: string;
  statement_column_name: string;
  inners: Array<{
    id?: string;
    value: string;
  }>;
}

export interface ReportRow {
  id: string;
  organization_name: string;
  report_items: Array<{
    organization_id: string;
    organization_name: string;
    statement_columns: ReportItem[];
  }>;
  children_reports?: ReportRow[];
  sent_by_full_name?: string;
  sent_by_org_name?: string;
  sent_by_role?: string;
}
