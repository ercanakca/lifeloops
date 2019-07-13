'use strict'

class SessionController {
  create ({ view }) {
    /**
     * Render the view 'sessions.create'.
     *
     * ref: http://adonisjs.com/docs/4.0/views
     */
    return view.render('session.create')
  }

  /**
   * Store a session.
   */
  async store ({ auth, request, response, session }) {

    const { username, password } = request.all()

    console.log(username)
    console.log(password)

    try {
      const sonuc =  await auth.attempt(username, password)
      console.log("---")

      const user = auth.user

      const ocns = await auth
    .authenticator('jwt')
          .generate(user)

      console.log("---> " + ocns)
    } catch (e) {
      /**
       * Add flash message to the session with the content of
       * the form except password field.
       *
       * ref: http://adonisjs.com/docs/4.1/sessions#_flash_messages
       */
      session.flashExcept(['password'])

      /**
       * Add a custom object to the session store.
       *
       * ref: http://adonisjs.com/docs/4.1/sessions#_flash
       */
        session.flash({ error: e + 'We cannot find any account with these credentials...' })

      /**
       * Since the authentication failed we redirect
       * our user back to the form.
       *
       * ref: http://adonisjs.com/docs/4.1/response#_redirects
       */
      return response.redirect('login')
    }

    /**
     * We are authenticated.
     */
    return response.redirect('/')
  }

  async delete ({ auth, response }) {
    /**
     * Logout the user.
     *
     * ref: http://adonisjs.com/docs/4.1/authentication#_logout
     */
    await auth.logout()

    return response.redirect('/')
  }
}

module.exports = SessionController
