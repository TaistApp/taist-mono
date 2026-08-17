<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        // Ignore Passport's vendor migrations since OAuth tables are already
        // created and managed in our database. This prevents migration conflicts
        // on Railway and other deployment environments.
        Passport::ignoreMigrations();

        //
        // $this->app['request']->server->set('HTTPS', true);
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        // Railway terminates TLS at its edge and APP_URL is set to an http://
        // origin, so url() emitted http:// links on pages served over https —
        // mixed content for the logo on the referral landing page and an
        // http OG image that social/SMS scrapers may reject. Local and test
        // runs stay http so `artisan serve` keeps working.
        if (! $this->app->environment('local', 'testing')) {
            URL::forceScheme('https');
        }

        // Generate Firebase credentials file from JSON env variable
        // Railway stores the JSON content directly in FIREBASE_CREDENTIALS
        // but the Laravel Firebase package expects a file path
        $firebaseCredentials = env('FIREBASE_CREDENTIALS');
        $credentialsPath = base_path('firebase_credentials.json');

        if ($firebaseCredentials && str_starts_with($firebaseCredentials, '{') && !file_exists($credentialsPath)) {
            file_put_contents($credentialsPath, $firebaseCredentials);
        }
    }
}
