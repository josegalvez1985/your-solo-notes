package com.tusolo.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.ServiceList;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;

@CapacitorPlugin(name = "Youtube")
public class YoutubePlugin extends Plugin {

    private static boolean initialized = false;
    private final OkHttpClient httpClient = new OkHttpClient();

    private synchronized void ensureInit() {
        if (!initialized) {
            NewPipe.init(DownloaderImpl.getInstance());
            initialized = true;
        }
    }

    @PluginMethod
    public void extractAndDownload(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing 'url' argument");
            return;
        }

        new Thread(() -> {
            try {
                ensureInit();
                final StreamInfo info = StreamInfo.getInfo(ServiceList.YouTube, url);
                final List<AudioStream> streams = info.getAudioStreams();
                if (streams == null || streams.isEmpty()) {
                    call.reject("No se encontraron streams de audio en este video");
                    return;
                }

                AudioStream best = streams.get(0);
                for (AudioStream s : streams) {
                    if (s.getAverageBitrate() > best.getAverageBitrate()) {
                        best = s;
                    }
                }

                final String suffix = best.getFormat() != null ? best.getFormat().getSuffix() : "m4a";
                final String mimeType = best.getFormat() != null ? best.getFormat().getMimeType() : "audio/mp4";
                final String fileName = "yt-" + UUID.randomUUID() + "." + suffix;
                final File cacheDir = getContext().getCacheDir();
                final File outFile = new File(cacheDir, fileName);

                final String audioUrl = best.getContent();
                final Request httpReq = new Request.Builder().url(audioUrl).build();
                try (Response resp = httpClient.newCall(httpReq).execute()) {
                    if (!resp.isSuccessful() || resp.body() == null) {
                        call.reject("Fallo al descargar audio: HTTP " + resp.code());
                        return;
                    }
                    try (ResponseBody body = resp.body();
                         InputStream in = body.byteStream();
                         FileOutputStream out = new FileOutputStream(outFile)) {
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            out.write(buf, 0, n);
                        }
                    }
                }

                final JSObject ret = new JSObject();
                ret.put("path", fileName);
                ret.put("absolutePath", outFile.getAbsolutePath());
                ret.put("title", info.getName());
                ret.put("duration", info.getDuration());
                ret.put("mimeType", mimeType);
                ret.put("bitrate", best.getAverageBitrate());
                call.resolve(ret);
            } catch (Throwable e) {
                final String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                call.reject(msg);
            }
        }).start();
    }
}
