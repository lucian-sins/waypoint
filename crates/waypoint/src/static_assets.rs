pub fn get_asset(path: &str) -> Option<(&'static [u8], &'static str)> {
    let clean = path.trim_start_matches('/');
    match clean {
        "" | "index.html" => get_index(),
        "assets/index-DDie99Ou.css" => Some((include_bytes!(r"../../../dist_static/assets/index-DDie99Ou.css"), "text/css; charset=utf-8")),
        "assets/index-xgdCUf4E.js" => Some((include_bytes!(r"../../../dist_static/assets/index-xgdCUf4E.js"), "application/javascript; charset=utf-8")),
        "favicon.svg" => Some((include_bytes!(r"../../../dist_static/favicon.svg"), "image/svg+xml")),
        "icon.svg" => Some((include_bytes!(r"../../../dist_static/icon.svg"), "image/svg+xml")),
        "manifest.webmanifest" => Some((include_bytes!(r"../../../dist_static/manifest.webmanifest"), "application/manifest+json")),
        "sw.js" => Some((include_bytes!(r"../../../dist_static/sw.js"), "application/javascript; charset=utf-8")),
        _ => None,
    }
}

pub fn get_index() -> Option<(&'static [u8], &'static str)> {
    Some((include_bytes!(r"../../../dist_static/index.html"), "text/html; charset=utf-8"))
}
