package com.produceconsumerobot.lovid.iparade;

import com.phonegap.*;
import android.os.Bundle;

public class IParade03Activity extends DroidGap {
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.init();
        super.loadUrl("file:///android_asset/www/index.html");
    }
}
