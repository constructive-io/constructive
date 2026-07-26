export interface SqlFeatures {
  feature_id: any | null;
  feature_name: any | null;
  sub_feature_id: any | null;
  sub_feature_name: any | null;
  is_supported: any | null;
  is_verified_by: any | null;
  comments: any | null;
}
export class SqlFeatures implements SqlFeatures {
  feature_id: any | null;
  feature_name: any | null;
  sub_feature_id: any | null;
  sub_feature_name: any | null;
  is_supported: any | null;
  is_verified_by: any | null;
  comments: any | null;
  constructor(data: SqlFeatures) {
    this.feature_id = data.feature_id;
    this.feature_name = data.feature_name;
    this.sub_feature_id = data.sub_feature_id;
    this.sub_feature_name = data.sub_feature_name;
    this.is_supported = data.is_supported;
    this.is_verified_by = data.is_verified_by;
    this.comments = data.comments;
  }
}
export interface SqlImplementationInfo {
  implementation_info_id: any | null;
  implementation_info_name: any | null;
  integer_value: any | null;
  character_value: any | null;
  comments: any | null;
}
export class SqlImplementationInfo implements SqlImplementationInfo {
  implementation_info_id: any | null;
  implementation_info_name: any | null;
  integer_value: any | null;
  character_value: any | null;
  comments: any | null;
  constructor(data: SqlImplementationInfo) {
    this.implementation_info_id = data.implementation_info_id;
    this.implementation_info_name = data.implementation_info_name;
    this.integer_value = data.integer_value;
    this.character_value = data.character_value;
    this.comments = data.comments;
  }
}
export interface SqlParts {
  feature_id: any | null;
  feature_name: any | null;
  is_supported: any | null;
  is_verified_by: any | null;
  comments: any | null;
}
export class SqlParts implements SqlParts {
  feature_id: any | null;
  feature_name: any | null;
  is_supported: any | null;
  is_verified_by: any | null;
  comments: any | null;
  constructor(data: SqlParts) {
    this.feature_id = data.feature_id;
    this.feature_name = data.feature_name;
    this.is_supported = data.is_supported;
    this.is_verified_by = data.is_verified_by;
    this.comments = data.comments;
  }
}
export interface SqlSizing {
  sizing_id: any | null;
  sizing_name: any | null;
  supported_value: any | null;
  comments: any | null;
}
export class SqlSizing implements SqlSizing {
  sizing_id: any | null;
  sizing_name: any | null;
  supported_value: any | null;
  comments: any | null;
  constructor(data: SqlSizing) {
    this.sizing_id = data.sizing_id;
    this.sizing_name = data.sizing_name;
    this.supported_value = data.supported_value;
    this.comments = data.comments;
  }
}