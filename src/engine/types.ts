export interface ProcessSettings {
  page_processing_mode: 'spread_split' | 'single_fit';
  split_offset_percent: number;
  page_order: 'left_to_right' | 'right_to_left';
  black_margin_threshold: number;
  crop_padding_px: number;
  use_adaptive_threshold: boolean;
  fixed_threshold: number;
  output_color_mode: 'monochrome' | 'original';
  render_dpi: number;
  output_dpi: number;
  body_start_page: number;
  front_matter_mode: 'single' | 'split' | 'skip';
  auto_crop_enabled: boolean;
  manual_trim_left_percent: number;
  manual_trim_right_percent: number;
  manual_trim_top_percent: number;
  manual_trim_bottom_percent: number;
}

export interface PageOverride {
  page_processing_mode: 'spread_split' | 'single_fit';
  split_offset_percent: number;
  page_order: 'left_to_right' | 'right_to_left';
  black_margin_threshold: number;
  crop_padding_px: number;
  use_adaptive_threshold: boolean;
  fixed_threshold: number;
  output_color_mode: 'monochrome' | 'original';
  auto_crop_enabled: boolean;
  manual_trim_left_percent: number;
  manual_trim_right_percent: number;
  manual_trim_top_percent: number;
  manual_trim_bottom_percent: number;
}

export interface PageData {
  id: string;
  originalImage: string;
  width: number;
  height: number;
}
