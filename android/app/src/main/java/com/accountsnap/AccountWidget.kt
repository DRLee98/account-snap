package com.accountsnap

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import org.json.JSONArray

private const val WIDGET_KEY_ACCOUNTS = "widget:accounts"
private const val WIDGET_KEY_LAST_USED_ID = "widget:lastUsedId"

data class WidgetAccount(
    val id: String,
    val bankName: String,
    val accountNumber: String,
    val label: String?,
    val isFavorite: Boolean,
)

private fun formatAccountNumber(raw: String, groupSize: Int = 4): String {
    val sb = StringBuilder()
    raw.forEachIndexed { i, c ->
        if (i > 0 && i % groupSize == 0) sb.append('-')
        sb.append(c)
    }
    return sb.toString()
}

private fun loadAccounts(context: Context): Pair<WidgetAccount?, List<WidgetAccount>> {
    val prefs = context.getSharedPreferences(AppGroupModule.SUITE, Context.MODE_PRIVATE)
    val json = prefs.getString(WIDGET_KEY_ACCOUNTS, "[]") ?: "[]"
    val all = mutableListOf<WidgetAccount>()
    try {
        val arr = JSONArray(json)
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            all.add(
                WidgetAccount(
                    id = o.getString("id"),
                    bankName = o.optString("bankName", ""),
                    accountNumber = o.optString("accountNumber", ""),
                    label = o.optString("label").takeIf { it.isNotEmpty() },
                    isFavorite = o.optBoolean("isFavorite", false),
                )
            )
        }
    } catch (_: Exception) {
    }
    val lastId = prefs.getString(WIDGET_KEY_LAST_USED_ID, null)
    val lastUsed = lastId?.let { id -> all.firstOrNull { it.id == id } } ?: all.firstOrNull()
    val favorites = all.filter { it.isFavorite }
    return lastUsed to favorites
}

private fun cameraIntent(): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("accountsnap://camera"))

private fun copyIntent(id: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("accountsnap://copy/$id"))

class AccountWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val (lastUsed, favorites) = loadAccounts(context)
        provideContent {
            GlanceTheme {
                WidgetContent(lastUsed, favorites)
            }
        }
    }
}

@Composable
private fun WidgetContent(lastUsed: WidgetAccount?, favorites: List<WidgetAccount>) {
    val size = LocalSize.current
    val isSmall = size.width < 180.dp || size.height < 120.dp
    val isLarge = size.height > 240.dp

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.widgetBackground)
            .padding(12.dp)
    ) {
        when {
            isSmall -> ShutterTile()
            isLarge -> LargeContent(favorites)
            else -> MediumContent(lastUsed)
        }
    }
}

@Composable
private fun LargeContent(favorites: List<WidgetAccount>) {
    Column(modifier = GlanceModifier.fillMaxSize()) {
        ShutterBar()
        Spacer(modifier = GlanceModifier.height(10.dp))
        Text(
            "⭐ 즐겨찾기",
            style = TextStyle(
                fontSize = 11.sp,
                color = GlanceTheme.colors.onSurfaceVariant,
            ),
        )
        Spacer(modifier = GlanceModifier.height(6.dp))
        if (favorites.isEmpty()) {
            Text(
                "즐겨찾기한 계좌가 없어요",
                style = TextStyle(
                    fontSize = 12.sp,
                    color = GlanceTheme.colors.onSurfaceVariant,
                ),
            )
        } else {
            LazyColumn {
                items(favorites.take(5), itemId = { it.id.hashCode().toLong() }) { a ->
                    FavoriteRow(a)
                }
            }
        }
    }
}

@Composable
private fun MediumContent(lastUsed: WidgetAccount?) {
    Row(modifier = GlanceModifier.fillMaxSize()) {
        Box(modifier = GlanceModifier.width(80.dp).fillMaxSize()) {
            ShutterTile()
        }
        Spacer(modifier = GlanceModifier.width(10.dp))
        Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.CenterStart) {
            if (lastUsed != null) {
                Column(
                    modifier = GlanceModifier.clickable(
                        actionStartActivity(copyIntent(lastUsed.id))
                    )
                ) {
                    Text(
                        "최근 추출",
                        style = TextStyle(
                            fontSize = 10.sp,
                            color = GlanceTheme.colors.onSurfaceVariant,
                        ),
                    )
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    Text(
                        lastUsed.label ?: lastUsed.bankName,
                        style = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Bold),
                        maxLines = 1,
                    )
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Text(
                        formatAccountNumber(lastUsed.accountNumber),
                        style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium),
                        maxLines = 2,
                    )
                }
            } else {
                Text(
                    "아직 없어요",
                    style = TextStyle(
                        fontSize = 12.sp,
                        color = GlanceTheme.colors.onSurfaceVariant,
                    ),
                )
            }
        }
    }
}

@Composable
private fun ShutterTile() {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.primaryContainer)
            .cornerRadius(12.dp)
            .clickable(actionStartActivity(cameraIntent())),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("📷", style = TextStyle(fontSize = 24.sp))
            Spacer(modifier = GlanceModifier.height(4.dp))
            Text(
                "촬영",
                style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold),
            )
        }
    }
}

@Composable
private fun ShutterBar() {
    Box(
        modifier = GlanceModifier
            .fillMaxWidth()
            .height(60.dp)
            .background(GlanceTheme.colors.primaryContainer)
            .cornerRadius(12.dp)
            .clickable(actionStartActivity(cameraIntent())),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("📷", style = TextStyle(fontSize = 22.sp))
            Spacer(modifier = GlanceModifier.width(10.dp))
            Column {
                Text(
                    "이체 계좌 촬영",
                    style = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Bold),
                )
                Text(
                    "이체할 이체 계좌 촬영하기",
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = GlanceTheme.colors.onSurfaceVariant,
                    ),
                )
            }
        }
    }
}

@Composable
private fun FavoriteRow(a: WidgetAccount) {
    Box(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(actionStartActivity(copyIntent(a.id)))
    ) {
        Column {
            Text(
                a.label ?: a.bankName,
                style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
            )
            Text(
                "${a.bankName} · ${formatAccountNumber(a.accountNumber)}",
                style = TextStyle(
                    fontSize = 11.sp,
                    color = GlanceTheme.colors.onSurfaceVariant,
                ),
                maxLines = 1,
            )
        }
    }
}

class AccountWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = AccountWidget()
}
